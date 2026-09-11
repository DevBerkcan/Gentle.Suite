"use client";
import { useState } from "react";
import { api } from "@/lib/api";

type HybridConfig = { downPaymentPercent: number; totalAmount: number; durationMonths: number };
type MonthlyConfig = { totalAmount: number };

function fmt(n: number) {
  return (Number.isFinite(n) ? n : 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function surchargeInfo(totalAmount: number, projectPrice: number) {
  if (projectPrice <= 0) return null;
  const pct = (totalAmount / projectPrice - 1) * 100;
  if (Math.abs(pct) < 0.05) return null;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% gegenüber Projektpreis`;
}

export default function PreisangebotModal({ quote, onClose, onSaved }: { quote: any; onClose: () => void; onSaved: (updated: any) => void }) {
  const projectPrice: number = quote.subtotalOneTime || 0;
  const [hybrid, setHybrid] = useState<HybridConfig>(quote.paymentPlanConfig?.hybrid || { downPaymentPercent: 37.5, totalAmount: projectPrice, durationMonths: 12 });
  const [monthly12, setMonthly12] = useState<MonthlyConfig>(quote.paymentPlanConfig?.monthly12 || { totalAmount: projectPrice });
  const [monthly24, setMonthly24] = useState<MonthlyConfig>(quote.paymentPlanConfig?.monthly24 || { totalAmount: projectPrice });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const downPayment = Math.round(hybrid.totalAmount * hybrid.downPaymentPercent / 100 * 100) / 100;
  const hybridFinanced = hybrid.totalAmount - downPayment;
  const hybridMonthly = hybrid.durationMonths > 0 ? hybridFinanced / hybrid.durationMonths : 0;

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

  async function applyToPositions(optionKey: "hybrid" | "monthly12" | "monthly24") {
    if (!confirm("Dies ersetzt alle aktuellen Angebotspositionen durch die Zahlungsaufteilung dieser Option. Fortfahren?")) return;

    const lines: any[] = [];
    if (optionKey === "hybrid") {
      if (downPayment > 0) lines.push({ title: "Anzahlung", description: "", quantity: 1, unitPrice: downPayment, discountPercent: 0, lineType: "OneTime", vatPercent: 19, sortOrder: 0 });
      if (hybrid.durationMonths > 0) lines.push({ title: `Monatsraten (${hybrid.durationMonths} × ${fmt(hybridMonthly)} €)`, description: "", quantity: hybrid.durationMonths, unitPrice: hybridMonthly, discountPercent: 0, lineType: "OneTime", vatPercent: 19, sortOrder: lines.length });
    } else if (optionKey === "monthly12") {
      const monthly = Math.round(monthly12.totalAmount / 12 * 100) / 100;
      lines.push({ title: `Monatsraten (12 × ${fmt(monthly)} €)`, description: "", quantity: 12, unitPrice: monthly, discountPercent: 0, lineType: "OneTime", vatPercent: 19, sortOrder: 0 });
    } else {
      const monthly = Math.round(monthly24.totalAmount / 24 * 100) / 100;
      lines.push({ title: `Monatsraten (24 × ${fmt(monthly)} €)`, description: "", quantity: 24, unitPrice: monthly, discountPercent: 0, lineType: "OneTime", vatPercent: 19, sortOrder: 0 });
    }

    setSaving(true);
    setError("");
    try {
      await api.updateQuoteLines(quote.id, lines);
      const updated = await api.updateQuote(quote.id, { paymentPlanConfig: { hybrid, monthly12, monthly24 } });
      onSaved(updated);
    } catch (e: any) {
      setError(e?.message || "Positionen konnten nicht übernommen werden");
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
          <p className="text-sm text-muted">Lege für die vier Zahlungsoptionen die Konditionen fest. Der Projektpreis wird automatisch aus den einmaligen Angebotspositionen berechnet — die Gesamtsumme je Zahlungsoption kannst du frei davon abweichend festlegen.</p>

          <div>
            <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Projektpreis (€)</label>
            <div className="px-3 py-2 border border-border rounded-lg text-lg font-semibold bg-background">{fmt(projectPrice)} €</div>
            {projectPrice === 0 && (
              <p className="mt-1 text-xs text-warning">Für dieses Angebot sind noch keine Positionen erfasst — der Projektpreis beträgt daher 0 €. Die hier eingegebenen Beträge bleiben trotzdem gespeichert; sobald du Positionen hinzufügst, erscheint der Projektpreis automatisch.</p>
            )}
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
                  <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Gesamtsumme (€)</label>
                  <input type="number" step="0.01" min={0} value={hybrid.totalAmount} onChange={e => setHybrid({ ...hybrid, totalAmount: +e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                  {surchargeInfo(hybrid.totalAmount, projectPrice) && <p className="mt-1 text-xs text-muted">≈ {surchargeInfo(hybrid.totalAmount, projectPrice)}</p>}
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted mb-1"><span className="uppercase tracking-wide">Anzahlung</span><span className="font-medium text-text">{hybrid.downPaymentPercent.toFixed(1)}%</span></div>
                  <input type="range" min={0} max={90} step={0.5} value={hybrid.downPaymentPercent} onChange={e => setHybrid({ ...hybrid, downPaymentPercent: +e.target.value })} className="w-full accent-primary" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted mb-1"><span className="uppercase tracking-wide">Laufzeit</span><span className="font-medium text-text">{hybrid.durationMonths} Monate</span></div>
                  <input type="range" min={2} max={60} step={1} value={hybrid.durationMonths} onChange={e => setHybrid({ ...hybrid, durationMonths: +e.target.value })} className="w-full accent-primary" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border text-sm">
                <div className="font-medium">Hybrid-Modell</div>
                <div className="text-muted">Anzahlung {fmt(downPayment)} € + {fmt(hybridMonthly)} €/Monat über {hybrid.durationMonths} Monate</div>
                <div className="text-muted">Gesamt: {fmt(hybrid.totalAmount)} €</div>
              </div>
              <button onClick={() => applyToPositions("hybrid")} disabled={saving} className="mt-3 w-full px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-background disabled:opacity-50">
                In Angebotspositionen übernehmen
              </button>
            </div>

            {/* Monatlich 12 */}
            <div className="border border-border rounded-xl p-4">
              <h3 className="font-semibold">Monatlich 12 Monate</h3>
              <p className="text-xs text-muted mt-1 mb-4">0 € Anzahlung · Gesamtsumme in 12 Monatsraten</p>
              <div>
                <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Gesamtsumme (€)</label>
                <input type="number" step="0.01" min={0} value={monthly12.totalAmount} onChange={e => setMonthly12({ totalAmount: +e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                {surchargeInfo(monthly12.totalAmount, projectPrice) && <p className="mt-1 text-xs text-muted">≈ {surchargeInfo(monthly12.totalAmount, projectPrice)}</p>}
              </div>
              <div className="mt-4 pt-3 border-t border-border text-sm">
                <div className="font-medium">Monatlich 12 Monate</div>
                <div className="text-muted">{fmt(monthly12.totalAmount / 12)} €/Monat über 12 Monate</div>
                <div className="text-muted">Gesamt: {fmt(monthly12.totalAmount)} €</div>
              </div>
              <button onClick={() => applyToPositions("monthly12")} disabled={saving} className="mt-3 w-full px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-background disabled:opacity-50">
                In Angebotspositionen übernehmen
              </button>
            </div>

            {/* Monatlich 24 */}
            <div className="border border-border rounded-xl p-4">
              <h3 className="font-semibold">Monatlich 24 Monate</h3>
              <p className="text-xs text-muted mt-1 mb-4">0 € Anzahlung · Gesamtsumme in 24 Monatsraten</p>
              <div>
                <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Gesamtsumme (€)</label>
                <input type="number" step="0.01" min={0} value={monthly24.totalAmount} onChange={e => setMonthly24({ totalAmount: +e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                {surchargeInfo(monthly24.totalAmount, projectPrice) && <p className="mt-1 text-xs text-muted">≈ {surchargeInfo(monthly24.totalAmount, projectPrice)}</p>}
              </div>
              <div className="mt-4 pt-3 border-t border-border text-sm">
                <div className="font-medium">Monatlich 24 Monate</div>
                <div className="text-muted">{fmt(monthly24.totalAmount / 24)} €/Monat über 24 Monate</div>
                <div className="text-muted">Gesamt: {fmt(monthly24.totalAmount)} €</div>
              </div>
              <button onClick={() => applyToPositions("monthly24")} disabled={saving} className="mt-3 w-full px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-background disabled:opacity-50">
                In Angebotspositionen übernehmen
              </button>
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
