"use client";
import { useState } from "react";
import { api } from "@/lib/api";

type HybridConfig = { downPaymentPercent: number; surchargePercent: number; durationMonths: number };
type MonthlyConfig = { surchargePercent: number };

const DEFAULT_HYBRID: HybridConfig = { downPaymentPercent: 37.5, surchargePercent: 15.0, durationMonths: 12 };
const DEFAULT_MONTHLY12: MonthlyConfig = { surchargePercent: 25.0 };
const DEFAULT_MONTHLY24: MonthlyConfig = { surchargePercent: 42.5 };

function fmt(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PreisangebotModal({ quote, onClose, onSaved }: { quote: any; onClose: () => void; onSaved: (updated: any) => void }) {
  const projectPrice: number = quote.subtotalOneTime || 0;
  const [hybrid, setHybrid] = useState<HybridConfig>(quote.paymentPlanConfig?.hybrid || DEFAULT_HYBRID);
  const [monthly12, setMonthly12] = useState<MonthlyConfig>(quote.paymentPlanConfig?.monthly12 || DEFAULT_MONTHLY12);
  const [monthly24, setMonthly24] = useState<MonthlyConfig>(quote.paymentPlanConfig?.monthly24 || DEFAULT_MONTHLY24);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const downPayment = Math.round(projectPrice * hybrid.downPaymentPercent / 100 * 100) / 100;
  const hybridFinanced = Math.round((projectPrice - downPayment) * (1 + hybrid.surchargePercent / 100) * 100) / 100;
  const hybridTotal = downPayment + hybridFinanced;
  const hybridMonthly = hybrid.durationMonths > 0 ? hybridFinanced / hybrid.durationMonths : 0;

  const m12Total = Math.round(projectPrice * (1 + monthly12.surchargePercent / 100) * 100) / 100;
  const m24Total = Math.round(projectPrice * (1 + monthly24.surchargePercent / 100) * 100) / 100;

  async function save() {
    setSaving(true);
    setError("");
    try {
      const updated = await api.updateQuote(quote.id, {
        paymentPlanConfig: { hybrid, monthly12, monthly24 },
      });
      onSaved(updated);
    } catch (e: any) {
      setError(e?.message || "Preisangebot konnte nicht gespeichert werden");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Preisangebot – {quote.subject || quote.quoteNumber}</h2>
            <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-gray-100 text-muted">● Entwurf</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-muted">Lege für die vier Zahlungsoptionen die Konditionen fest. Der Projektpreis wird automatisch aus den einmaligen Angebotspositionen berechnet.</p>

          <div>
            <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Projektpreis (€)</label>
            <div className="px-3 py-2 border border-border rounded-lg text-lg font-semibold bg-background">{fmt(projectPrice)} €</div>
          </div>

          {error && <div className="bg-red-50 text-danger px-3 py-2 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Einmalzahlung */}
            <div className="border border-border rounded-xl p-4">
              <h3 className="font-semibold">Einmalzahlung</h3>
              <p className="text-xs text-muted mt-1 mb-4">100% Projektpreis · keine monatliche Zahlung · günstigste Variante</p>
              <div className="text-lg font-semibold">{fmt(projectPrice)} €</div>
            </div>

            {/* Hybrid */}
            <div className="border border-border rounded-xl p-4">
              <h3 className="font-semibold">Hybrid-Modell</h3>
              <p className="text-xs text-muted mt-1 mb-4">Anzahlung · Rest in Raten · Laufzeit wählbar</p>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-muted mb-1"><span className="uppercase tracking-wide">Anzahlung</span><span className="font-medium text-text">{hybrid.downPaymentPercent.toFixed(1)}%</span></div>
                  <input type="range" min={0} max={90} step={0.5} value={hybrid.downPaymentPercent} onChange={e => setHybrid({ ...hybrid, downPaymentPercent: +e.target.value })} className="w-full accent-primary" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted mb-1"><span className="uppercase tracking-wide">Aufschlag auf Restbetrag</span><span className="font-medium text-text">{hybrid.surchargePercent.toFixed(1)}%</span></div>
                  <input type="range" min={0} max={100} step={0.5} value={hybrid.surchargePercent} onChange={e => setHybrid({ ...hybrid, surchargePercent: +e.target.value })} className="w-full accent-primary" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted mb-1"><span className="uppercase tracking-wide">Laufzeit</span><span className="font-medium text-text">{hybrid.durationMonths} Monate</span></div>
                  <input type="range" min={2} max={60} step={1} value={hybrid.durationMonths} onChange={e => setHybrid({ ...hybrid, durationMonths: +e.target.value })} className="w-full accent-primary" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border text-sm">
                <div className="font-medium">Hybrid-Modell</div>
                <div className="text-muted">Anzahlung {fmt(downPayment)} € + {fmt(hybridMonthly)} €/Monat über {hybrid.durationMonths} Monate</div>
                <div className="text-muted">Gesamt: {fmt(hybridTotal)} €</div>
              </div>
            </div>

            {/* Monatlich 12 */}
            <div className="border border-border rounded-xl p-4">
              <h3 className="font-semibold">Monatlich 12 Monate</h3>
              <p className="text-xs text-muted mt-1 mb-4">0 € Anzahlung · voller Preis + Aufschlag über 12 Monate</p>
              <div>
                <div className="flex justify-between text-xs text-muted mb-1"><span className="uppercase tracking-wide">Aufschlag</span><span className="font-medium text-text">{monthly12.surchargePercent.toFixed(1)}%</span></div>
                <input type="range" min={0} max={100} step={0.5} value={monthly12.surchargePercent} onChange={e => setMonthly12({ surchargePercent: +e.target.value })} className="w-full accent-primary" />
              </div>
              <div className="mt-4 pt-3 border-t border-border text-sm">
                <div className="font-medium">Monatlich 12 Monate</div>
                <div className="text-muted">{fmt(m12Total / 12)} €/Monat über 12 Monate</div>
                <div className="text-muted">Gesamt: {fmt(m12Total)} €</div>
              </div>
            </div>

            {/* Monatlich 24 */}
            <div className="border border-border rounded-xl p-4">
              <h3 className="font-semibold">Monatlich 24 Monate</h3>
              <p className="text-xs text-muted mt-1 mb-4">0 € Anzahlung · voller Preis + Aufschlag über 24 Monate</p>
              <div>
                <div className="flex justify-between text-xs text-muted mb-1"><span className="uppercase tracking-wide">Aufschlag</span><span className="font-medium text-text">{monthly24.surchargePercent.toFixed(1)}%</span></div>
                <input type="range" min={0} max={150} step={0.5} value={monthly24.surchargePercent} onChange={e => setMonthly24({ surchargePercent: +e.target.value })} className="w-full accent-primary" />
              </div>
              <div className="mt-4 pt-3 border-t border-border text-sm">
                <div className="font-medium">Monatlich 24 Monate</div>
                <div className="text-muted">{fmt(m24Total / 24)} €/Monat über 24 Monate</div>
                <div className="text-muted">Gesamt: {fmt(m24Total)} €</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button onClick={save} disabled={saving} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background disabled:opacity-50">
            {saving ? "Speichern..." : "Entwurf speichern"}
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
            {saving ? "Speichern..." : "Preis freigeben"}
          </button>
        </div>
      </div>
    </div>
  );
}
