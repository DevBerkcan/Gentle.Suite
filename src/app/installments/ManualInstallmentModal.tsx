"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

function fmt(n: number) {
  return (Number.isFinite(n) ? n : 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ManualInstallmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [downPaymentAmount, setDownPaymentAmount] = useState<number>(0);
  const [monthlyAmount, setMonthlyAmount] = useState<number>(0);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { api.customers().then((result: any) => setCustomers(result.items || [])).catch(() => {}); }, []);

  const financedAmount = Math.max(0, totalAmount - (downPaymentAmount || 0));
  const months = monthlyAmount > 0 ? Math.ceil(financedAmount / monthlyAmount) : 0;
  const lastInstallment = months > 0 ? financedAmount - monthlyAmount * (months - 1) : 0;

  const canSubmit = customerId && title.trim() && totalAmount > 0 && monthlyAmount > 0 &&
    (downPaymentAmount || 0) >= 0 && (downPaymentAmount || 0) < totalAmount && confirmed && !saving;

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await api.createManualInstallmentPlan({
        customerId,
        title: title.trim(),
        totalAmount,
        downPaymentAmount: downPaymentAmount > 0 ? downPaymentAmount : null,
        monthlyAmount,
        businessCustomerConfirmed: confirmed,
      });
      onCreated();
    } catch (e: any) {
      setError(e?.message || "Ratenzahlungsplan konnte nicht angelegt werden");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Manuell Ratenzahlungsplan erstellen</h2>
            <p className="text-xs text-muted mt-1">Für Zahlungszusagen, die außerhalb des Systems (Telefon/persönlich) bestätigt wurden.</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-danger px-3 py-2 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Kunde</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg">
              <option value="">Bitte wählen...</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Bezeichnung</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Webdesign Pro" className="w-full px-3 py-2 border border-border rounded-lg" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Gesamtbetrag (€)</label>
              <input type="number" step="0.01" min={0} value={totalAmount} onChange={e => setTotalAmount(+e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Anzahlung (€, optional)</label>
              <input type="number" step="0.01" min={0} value={downPaymentAmount} onChange={e => setDownPaymentAmount(+e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Rate/Monat (€)</label>
              <input type="number" step="0.01" min={0} value={monthlyAmount} onChange={e => setMonthlyAmount(+e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
          </div>

          {monthlyAmount > 0 && totalAmount > 0 && (
            <div className="bg-background border border-border rounded-lg p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">Zu finanzieren</span><span className="font-medium">{fmt(financedAmount)} €</span></div>
              <div className="flex justify-between mt-1"><span className="text-muted">Laufzeit</span><span className="font-medium">{months} {months === 1 ? "Monat" : "Monate"}</span></div>
              <div className="flex justify-between mt-1"><span className="text-muted">Letzte Rate</span><span className="font-medium">{fmt(lastInstallment)} €</span></div>
              {downPaymentAmount > 0 && (
                <div className="mt-2 text-xs text-muted">Anzahlung wird sofort in Rechnung gestellt, die erste Monatsrate wird einen Monat später fällig.</div>
              )}
            </div>
          )}

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />
            <span>Ich bestätige, dass der Kunde als Unternehmer handelt (B2B) und die Ratenzahlung anderweitig vereinbart/bestätigt wurde.</span>
          </label>

          <p className="text-xs text-muted">Beim Anlegen wird automatisch die Mollie-Mandats-E-Mail an den Kunden verschickt.</p>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">Abbrechen</button>
          <button onClick={submit} disabled={!canSubmit} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
            {saving ? "Wird angelegt..." : "Ratenzahlungsplan anlegen"}
          </button>
        </div>
      </div>
    </div>
  );
}
