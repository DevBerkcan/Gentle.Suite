"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const statusMap: Record<string, { label: string; cls: string }> = {
  Draft: { label: "Entwurf", cls: "bg-gray-100 text-gray-700" },
  SentForSignature: { label: "Wartet auf Unterschrift", cls: "bg-orange-50 text-orange-700" },
  FullyExecuted: { label: "Abgeschlossen", cls: "bg-green-50 text-success" },
  Declined: { label: "Abgelehnt", cls: "bg-red-50 text-danger" },
};

const STATUS_FILTERS = ["Alle", "Draft", "SentForSignature", "FullyExecuted", "Declined"];

export default function ContractsListPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alle");

  useEffect(() => {
    api.agencyContracts().then(setContracts).catch(() => setError("Verträge konnten nicht geladen werden"));
  }, []);

  const filtered = statusFilter === "Alle" ? contracts : contracts.filter(c => c.status === statusFilter);
  const s = (status: string) => statusMap[status] || { label: status, cls: "bg-gray-100 text-gray-700" };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Verträge</h1>
        <p className="text-sm text-muted mt-0.5">Alle Agenturverträge — Wartungsverträge, SEO-Verträge, Webdesign-Verträge und mehr.</p>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="flex gap-1 bg-background border border-border rounded-lg p-1 mb-4 w-fit">
        {STATUS_FILTERS.map(f => {
          const count = f === "Alle" ? contracts.length : contracts.filter(c => c.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === f ? "bg-surface shadow-sm text-text" : "text-muted hover:text-text"}`}
            >
              {f === "Alle" ? "Alle" : s(f).label} {count > 0 && <span className="ml-0.5 text-muted">({count})</span>}
            </button>
          );
        })}
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="px-4 py-3 text-left text-xs text-muted">Nr.</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Kunde</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Art</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Status</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Angelegt</th>
              <th className="px-4 py-3 text-right text-xs text-muted">Wert</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-border hover:bg-background cursor-pointer" onClick={() => window.location.href = `/contracts/${c.id}`}>
                <td className="px-4 py-3 font-medium">{c.contractNumber}</td>
                <td className="px-4 py-3">{c.customerName}</td>
                <td className="px-4 py-3">{c.contractTypeName}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${s(c.status).cls}`}>{s(c.status).label}</span></td>
                <td className="px-4 py-3 text-sm text-muted">{new Date(c.createdAt).toLocaleDateString("de")}</td>
                <td className="px-4 py-3 text-right font-medium">{c.totalContractValue != null ? `${Number(c.totalContractValue).toFixed(2)} €` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted text-sm">Keine Verträge vorhanden.</div>
        )}
      </div>
    </div>
  );
}
