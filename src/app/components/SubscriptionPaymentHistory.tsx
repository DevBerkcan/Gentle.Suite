"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const invoiceStatusMap: Record<string, { label: string; cls: string }> = {
  Draft: { label: "Entwurf", cls: "bg-gray-100 text-gray-600" },
  Final: { label: "Final", cls: "bg-blue-50 text-blue-700" },
  Sent: { label: "Gesendet", cls: "bg-yellow-50 text-yellow-700" },
  Paid: { label: "Bezahlt", cls: "bg-green-50 text-green-700" },
  Overdue: { label: "Überfällig", cls: "bg-red-50 text-red-700" },
  Cancelled: { label: "Storniert", cls: "bg-gray-100 text-gray-500" },
};

const collectionStatusMap: Record<string, string> = {
  scheduled: "Einzug angekündigt",
  open: "Einzug offen",
  pending: "Einzug läuft",
  paid: "Über Mollie eingezogen",
  failed: "Einzug fehlgeschlagen",
  canceled: "Einzug abgebrochen",
  expired: "Einzug abgelaufen",
  error: "Mollie-Fehler",
};

interface Props {
  subscriptionId: string;
  isInstallmentPlan?: boolean;
  installmentsCompleted?: number;
  contractDurationMonths?: number | null;
  totalInstallmentAmount?: number | null;
  amountPerPeriod: number;
  nextBillingDate?: string;
  status: string;
  /** Server-computed sum of actually paid (Mollie-confirmed) invoices — net amount. */
  paidAmount?: number;
}

/**
 * Zahlungsübersicht/-kontrolle für eine einzelne Serienrechnung oder Ratenzahlung: bisher
 * eingezogene Beträge, nächste geplante Abbuchung, Rechnungsverlauf mit Mollie-Status und
 * (bei Ratenzahlungen) ein rechnerischer Ausblick auf die verbleibenden Raten.
 */
export default function SubscriptionPaymentHistory({
  subscriptionId,
  isInstallmentPlan,
  installmentsCompleted,
  contractDurationMonths,
  totalInstallmentAmount,
  amountPerPeriod,
  nextBillingDate,
  status,
  paidAmount,
}: Props) {
  const [invoices, setInvoices] = useState<any[] | null>(null);

  useEffect(() => {
    let active = true;
    api
      .subscriptionInvoices(subscriptionId)
      .then((list) => { if (active) setInvoices(Array.isArray(list) ? list : []); })
      .catch(() => { if (active) setInvoices([]); });
    return () => { active = false; };
  }, [subscriptionId]);

  const inv = (s: string) => invoiceStatusMap[s] || { label: s, cls: "bg-gray-100 text-gray-600" };
  const paidInvoices = (invoices || []).filter((i) => i.status === "Paid");
  // Server-computed net sum (single source of truth, shared with the table's progress bar).
  const paidSum = paidAmount ?? 0;
  const paidPercent = isInstallmentPlan && totalInstallmentAmount ? Math.min(100, (paidSum / totalInstallmentAmount) * 100) : null;

  const remainingPreview: { n: number; date: Date; amount: number }[] = [];
  if (isInstallmentPlan && contractDurationMonths && nextBillingDate && (status === "Active" || status === "PendingConfirmation")) {
    const completed = installmentsCompleted || 0;
    const remaining = contractDurationMonths - completed;
    let d = new Date(nextBillingDate);
    for (let i = 0; i < remaining; i++) {
      const isLast = completed + i === contractDurationMonths - 1;
      const amount = isLast && totalInstallmentAmount != null
        ? totalInstallmentAmount - amountPerPeriod * (contractDurationMonths - 1)
        : amountPerPeriod;
      remainingPreview.push({ n: completed + i + 1, date: new Date(d), amount });
      d = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-6 mb-3 text-xs">
        <div>
          <p className="text-gray-500">{isInstallmentPlan ? "Raten bezahlt" : "Abrechnungen bisher"}</p>
          <p className="font-semibold text-gray-800">
            {isInstallmentPlan ? `${installmentsCompleted || 0} von ${contractDurationMonths ?? "–"}` : invoices?.length ?? "…"}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Bisher eingezogen</p>
          <p className="font-semibold text-gray-800">
            {paidSum.toFixed(2)} € {invoices ? `(${paidInvoices.length} Zahlung${paidInvoices.length === 1 ? "" : "en"})` : ""}
          </p>
        </div>
        {paidPercent != null && (
          <div className="min-w-[160px] flex-1">
            <p className="text-gray-500">Vom Gesamtbetrag eingegangen</p>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full rounded-full bg-success" style={{ width: `${paidPercent}%` }} />
              </div>
              <span className="font-semibold text-gray-800 shrink-0">{paidPercent.toFixed(0)}%</span>
            </div>
            <p className="mt-1 text-gray-500">{paidSum.toFixed(2)} € von {Number(totalInstallmentAmount).toFixed(2)} €</p>
          </div>
        )}
        {nextBillingDate && (status === "Active" || status === "PendingConfirmation") && (
          <div>
            <p className="text-gray-500">Nächste geplante Abbuchung</p>
            <p className="font-semibold text-gray-800">{new Date(nextBillingDate).toLocaleDateString("de")} · {amountPerPeriod.toFixed(2)} €</p>
          </div>
        )}
      </div>

      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{isInstallmentPlan ? "Ratenverlauf" : "Rechnungsverlauf"}</p>
      {invoices === null ? (
        <p className="text-xs text-gray-400">Laden...</p>
      ) : invoices.length === 0 ? (
        <p className="text-xs text-gray-400">Noch keine Rechnungen vorhanden</p>
      ) : (
        <table className="w-full text-sm bg-white rounded-lg border border-gray-200 overflow-hidden mb-3">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Rechnungs-Nr.</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Datum</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Zeitraum</th>
              <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Betrag (Brutto)</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i: any) => (
              <tr key={i.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-800">{i.invoiceNumber}</td>
                <td className="px-3 py-2 text-gray-500">{new Date(i.invoiceDate).toLocaleDateString("de")}</td>
                <td className="px-3 py-2 text-gray-500">
                  {i.billingPeriodStart && i.billingPeriodEnd
                    ? `${new Date(i.billingPeriodStart).toLocaleDateString("de")} – ${new Date(i.billingPeriodEnd).toLocaleDateString("de")}`
                    : "–"}
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-800">{Number(i.grossTotal).toFixed(2)} €</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${inv(i.status).cls}`}>{collectionStatusMap[i.paymentCollectionStatus] || inv(i.status).label}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {remainingPreview.length > 0 && (
        <>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Ausblick verbleibende Raten</p>
          <table className="w-full text-sm bg-white rounded-lg border border-gray-200 overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Rate</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Geplanter Termin</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {remainingPreview.map((r) => (
                <tr key={r.n} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-500">Rate {r.n} von {contractDurationMonths}</td>
                  <td className="px-3 py-2 text-gray-500">{r.date.toLocaleDateString("de")}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{r.amount.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
