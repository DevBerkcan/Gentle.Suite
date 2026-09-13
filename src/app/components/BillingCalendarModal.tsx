"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

function fmt(n: number) {
  return (Number.isFinite(n) ? n : 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Scope = "recurring" | "installments" | "all";

export default function BillingCalendarModal({ onClose, defaultScope = "all" }: { onClose: () => void; defaultScope?: Scope }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState<30 | 60 | 90>(30);
  const [scope, setScope] = useState<Scope>(defaultScope);

  useEffect(() => {
    api.billingCalendar(90)
      .then(setData)
      .catch(() => setError("Abrechnungskalender konnte nicht geladen werden"))
      .finally(() => setLoading(false));
  }, []);

  const occurrences = (data?.occurrences || []) as any[];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + rangeDays);

  const filtered = occurrences.filter((o) => {
    if (new Date(o.date) > cutoff) return false;
    if (scope === "recurring" && o.isInstallmentPlan) return false;
    if (scope === "installments" && !o.isInstallmentPlan) return false;
    return true;
  });
  const total = filtered.reduce((sum, o) => sum + Number(o.amount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Abrechnungskalender</h2>
            <p className="text-xs text-muted mt-1">Wann welcher Kunde als nächstes abgebucht wird — über alle aktiven Serienrechnungen und Ratenzahlungen.</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-danger px-3 py-2 rounded-lg text-sm">{error}</div>}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 bg-background border border-border rounded-lg p-1">
              {[30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setRangeDays(d as 30 | 60 | 90)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${rangeDays === d ? "bg-surface shadow-sm text-text" : "text-muted hover:text-text"}`}
                >
                  {d} Tage
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-background border border-border rounded-lg p-1">
              {[
                { key: "all", label: "Alle" },
                { key: "recurring", label: "Serienrechnung" },
                { key: "installments", label: "Ratenzahlung" },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setScope(s.key as Scope)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${scope === s.key ? "bg-surface shadow-sm text-text" : "text-muted hover:text-text"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="px-4 py-2 text-left text-xs text-muted">Datum</th>
                  <th className="px-4 py-2 text-left text-xs text-muted">Kunde</th>
                  <th className="px-4 py-2 text-left text-xs text-muted">Bezeichnung</th>
                  <th className="px-4 py-2 text-left text-xs text-muted">Typ</th>
                  <th className="px-4 py-2 text-right text-xs text-muted">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => (
                  <tr key={`${o.subscriptionId}-${o.date}-${i}`} className="border-b border-border last:border-0 hover:bg-background">
                    <td className="px-4 py-2 text-sm">{new Date(o.date).toLocaleDateString("de")}</td>
                    <td className="px-4 py-2 text-sm font-medium">{o.customerName}</td>
                    <td className="px-4 py-2 text-sm text-muted">{o.title}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${o.isInstallmentPlan ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700"}`}>
                        {o.isInstallmentPlan ? "Ratenzahlung" : "Serienrechnung"}
                      </span>
                      {o.isLastInstallment && <span className="ml-1 text-xs px-2 py-1 rounded-full bg-green-50 text-success">letzte Rate</span>}
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-medium">{fmt(o.amount)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filtered.length === 0 && (
              <div className="p-8 text-center text-muted text-sm">Keine anstehenden Abbuchungen in diesem Zeitraum.</div>
            )}
            {loading && <div className="p-8 text-center text-muted text-sm">Lädt...</div>}
          </div>
        </div>

        <div className="p-6 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted">
            Nächste 30 Tage: <span className="font-semibold text-text">{fmt(data?.totalNext30Days || 0)} €</span>
            <span className="mx-2">·</span>
            Nächste 90 Tage: <span className="font-semibold text-text">{fmt(data?.totalNext90Days || 0)} €</span>
          </div>
          <div className="text-sm">
            Summe ({rangeDays} Tage, {scope === "all" ? "alle" : scope === "recurring" ? "Serienrechnung" : "Ratenzahlung"}): <span className="font-semibold text-text">{fmt(total)} €</span>
          </div>
        </div>
      </div>
    </div>
  );
}
