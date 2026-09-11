"use client";
import { useState } from "react";
import { api } from "@/lib/api";

type OptionKey = "hybrid" | "monthly12" | "monthly24";

function fmt(n: number) {
  return (Number.isFinite(n) ? n : 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function initialState(quote: any) {
  const cfg = quote.paymentPlanConfig;
  const projectPrice: number = quote.subtotalOneTime || 0;
  if (cfg?.hybrid?.totalAmount > 0) return { selected: "hybrid" as OptionKey, gesamtbetrag: cfg.hybrid.totalAmount, downPaymentPercent: cfg.hybrid.downPaymentPercent ?? 37.5, durationMonths: cfg.hybrid.durationMonths ?? 12 };
  if (cfg?.monthly12?.totalAmount > 0) return { selected: "monthly12" as OptionKey, gesamtbetrag: cfg.monthly12.totalAmount, downPaymentPercent: 37.5, durationMonths: 12 };
  if (cfg?.monthly24?.totalAmount > 0) return { selected: "monthly24" as OptionKey, gesamtbetrag: cfg.monthly24.totalAmount, downPaymentPercent: 37.5, durationMonths: 12 };
  return { selected: "hybrid" as OptionKey, gesamtbetrag: projectPrice, downPaymentPercent: 37.5, durationMonths: 12 };
}

export default function PreisangebotModal({ quote, onClose, onSaved }: { quote: any; onClose: () => void; onSaved: (updated: any) => void }) {
  const projectPrice: number = quote.subtotalOneTime || 0;
  const init = initialState(quote);
  const [selected, setSelected] = useState<OptionKey>(init.selected);
  const [gesamtbetrag, setGesamtbetrag] = useState<number>(init.gesamtbetrag);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(init.downPaymentPercent);
  const [durationMonths, setDurationMonths] = useState<number>(init.durationMonths);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const downPayment = Math.round(gesamtbetrag * downPaymentPercent / 100 * 100) / 100;
  const hybridFinanced = gesamtbetrag - downPayment;
  const hybridMonthly = durationMonths > 0 ? hybridFinanced / durationMonths : 0;
  const m12Monthly = gesamtbetrag / 12;
  const m24Monthly = gesamtbetrag / 24;

  async function apply() {
    if (gesamtbetrag <= 0) return;
    if (!confirm("Dies ersetzt alle aktuellen Angebotspositionen durch die Zahlungsaufteilung dieser Option. Fortfahren?")) return;

    const existingDescription = (quote.lines || [])
      .map((l: any) => (l.description ? `${l.title}: ${l.description}` : l.title))
      .filter(Boolean)
      .join("\n");

    const lines: any[] = [];
    if (selected === "hybrid") {
      if (downPayment > 0) lines.push({ title: "Anzahlung", description: existingDescription, quantity: 1, unitPrice: downPayment, discountPercent: 0, lineType: "OneTime", vatPercent: 19, sortOrder: 0 });
      lines.push({ title: `Monatsraten (${durationMonths} × ${fmt(hybridMonthly)} €)`, description: existingDescription, quantity: durationMonths, unitPrice: hybridMonthly, discountPercent: 0, lineType: "OneTime", vatPercent: 19, sortOrder: lines.length });
    } else if (selected === "monthly12") {
      lines.push({ title: `Monatsraten (12 × ${fmt(m12Monthly)} €)`, description: existingDescription, quantity: 12, unitPrice: m12Monthly, discountPercent: 0, lineType: "OneTime", vatPercent: 19, sortOrder: 0 });
    } else {
      lines.push({ title: `Monatsraten (24 × ${fmt(m24Monthly)} €)`, description: existingDescription, quantity: 24, unitPrice: m24Monthly, discountPercent: 0, lineType: "OneTime", vatPercent: 19, sortOrder: 0 });
    }

    const paymentPlanConfig = {
      hybrid: selected === "hybrid" ? { downPaymentPercent, totalAmount: gesamtbetrag, durationMonths } : { downPaymentPercent: 0, totalAmount: 0, durationMonths: 12 },
      monthly12: { totalAmount: selected === "monthly12" ? gesamtbetrag : 0 },
      monthly24: { totalAmount: selected === "monthly24" ? gesamtbetrag : 0 },
    };

    setSaving(true);
    setError("");
    try {
      await api.updateQuoteLines(quote.id, lines);
      const updated = await api.updateQuote(quote.id, { paymentPlanConfig });
      onSaved(updated);
    } catch (e: any) {
      setError(e?.message || "Preisangebot konnte nicht übernommen werden");
    } finally {
      setSaving(false);
    }
  }

  function Card({ optionKey, title, subtitle, children, summary }: { optionKey: OptionKey; title: string; subtitle: string; children?: React.ReactNode; summary: React.ReactNode }) {
    const isSelected = selected === optionKey;
    return (
      <label className={`block border rounded-xl p-4 cursor-pointer transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-background"}`}>
        <div className="flex items-start gap-3 mb-1">
          <input type="radio" name="paymentOption" className="mt-1" checked={isSelected} onChange={() => setSelected(optionKey)} />
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-muted mt-0.5">{subtitle}</p>
          </div>
        </div>
        {children && <div className="mt-3 space-y-3">{children}</div>}
        <div className="mt-4 pt-3 border-t border-border text-sm">{summary}</div>
      </label>
    );
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
          <p className="text-sm text-muted">Trage die Gesamtsumme ein und wähle eine der drei Zahlungsweisen. Die Einmalzahlung läuft weiterhin über den normalen Angebot-zu-Rechnung-Weg und wird hier nicht konfiguriert.</p>

          <div>
            <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Gesamtbetrag (€)</label>
            <input type="number" step="0.01" min={0} value={gesamtbetrag} onChange={e => setGesamtbetrag(+e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-lg font-semibold" />
            <p className="mt-1 text-xs text-muted">Projektpreis aus Positionen: {fmt(projectPrice)} € {projectPrice === 0 && "— für dieses Angebot sind noch keine Positionen erfasst."}</p>
          </div>

          {error && <div className="bg-red-50 text-danger px-3 py-2 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              optionKey="hybrid"
              title="Hybrid-Modell"
              subtitle="Anzahlung · Rest in Raten · Laufzeit wählbar"
              summary={<>
                <div className="font-medium">Hybrid-Modell</div>
                <div className="text-muted">Anzahlung {fmt(downPayment)} € + {fmt(hybridMonthly)} €/Monat über {durationMonths} Monate</div>
              </>}
            >
              <div>
                <div className="flex justify-between text-xs text-muted mb-1"><span className="uppercase tracking-wide">Anzahlung</span><span className="font-medium text-text">{downPaymentPercent.toFixed(1)}%</span></div>
                <input type="range" min={0} max={90} step={0.5} value={downPaymentPercent} onChange={e => setDownPaymentPercent(+e.target.value)} onClick={() => setSelected("hybrid")} className="w-full accent-primary" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted mb-1"><span className="uppercase tracking-wide">Laufzeit</span><span className="font-medium text-text">{durationMonths} Monate</span></div>
                <input type="range" min={2} max={60} step={1} value={durationMonths} onChange={e => setDurationMonths(+e.target.value)} onClick={() => setSelected("hybrid")} className="w-full accent-primary" />
              </div>
            </Card>

            <Card
              optionKey="monthly12"
              title="Monatlich 12 Monate"
              subtitle="0 € Anzahlung · Gesamtsumme in 12 Raten"
              summary={<>
                <div className="font-medium">Monatlich 12 Monate</div>
                <div className="text-muted">{fmt(m12Monthly)} €/Monat über 12 Monate</div>
              </>}
            />

            <Card
              optionKey="monthly24"
              title="Monatlich 24 Monate"
              subtitle="0 € Anzahlung · Gesamtsumme in 24 Raten"
              summary={<>
                <div className="font-medium">Monatlich 24 Monate</div>
                <div className="text-muted">{fmt(m24Monthly)} €/Monat über 24 Monate</div>
              </>}
            />
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">Abbrechen</button>
          <button onClick={apply} disabled={saving || gesamtbetrag <= 0} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
            {saving ? "Wird übernommen..." : "Übernehmen"}
          </button>
        </div>
      </div>
    </div>
  );
}
