"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { EstimateListItem, EstimateStatus, PagedResult } from "@/types/api";
import { ESTIMATE_STATUS, formatEur, formatRange } from "./estimateDefaults";

const STATUS_FILTERS: ("Alle" | EstimateStatus)[] = ["Alle", "Draft", "Sent", "Accepted", "Rejected"];
const PAGE_SIZE = 25;

export default function EstimatesListPage() {
  const [data, setData] = useState<PagedResult<EstimateListItem> | null>(null);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Alle" | EstimateStatus>("Alle");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (statusFilter !== "Alle") qs.set("status", statusFilter);
    if (search.trim()) qs.set("search", search.trim());
    const t = setTimeout(() => {
      api.estimates(qs.toString()).then(setData).catch(() => setError("Schätzungen konnten nicht geladen werden"));
    }, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [page, statusFilter, search]);

  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Schätzungen</h1>
          <p className="text-sm text-muted mt-0.5">Aufwandsschätzungen und Ersteinschätzungen mit Pauschalen — als PDF im Gentle-Group-Layout.</p>
        </div>
        <a href="/contracts/estimates/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover">
          <Plus size={15} /> Neue Schätzung
        </a>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-background border border-border rounded-lg p-1 w-fit">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => { setStatusFilter(f); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === f ? "bg-surface shadow-sm text-text" : "text-muted hover:text-text"}`}
            >
              {f === "Alle" ? "Alle" : ESTIMATE_STATUS[f].label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Suchen (Nr., Titel, Kunde)"
          className="px-3 py-1.5 border border-border rounded-lg text-sm bg-surface w-64"
        />
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="px-4 py-3 text-left text-xs text-muted">Nr.</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Titel</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Kunde</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Version</th>
              <th className="px-4 py-3 text-right text-xs text-muted">Festpreis</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Status</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Datum</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => {
              const st = ESTIMATE_STATUS[e.status] ?? { label: e.status, cls: "bg-gray-100 text-gray-700" };
              const d = e.date.slice(0, 10).split("-");
              return (
                <tr key={e.id} className="border-b border-border hover:bg-background cursor-pointer" onClick={() => (window.location.href = `/contracts/estimates/${e.id}`)}>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{e.estimateNumber}</td>
                  <td className="px-4 py-3">{e.title}</td>
                  <td className="px-4 py-3">{e.customerName || <span className="text-muted">–</span>}</td>
                  <td className="px-4 py-3 text-sm">V{e.version}</td>
                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    {e.fixedPrice != null
                      ? formatEur(e.fixedPrice)
                      : e.modulesTo > 0
                        ? <span className="text-muted font-normal">{formatRange(e.modulesFrom, e.modulesTo)}</span>
                        : "–"}
                  </td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${st.cls}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">{d.length === 3 ? `${d[2]}.${d[1]}.${d[0]}` : e.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data && items.length === 0 && <div className="p-8 text-center text-muted text-sm">Keine Schätzungen vorhanden.</div>}
        {!data && !error && <div className="p-8 text-center text-muted text-sm">Lädt...</div>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40">Zurück</button>
          <span className="text-muted">Seite {page} von {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40">Weiter</button>
        </div>
      )}
    </div>
  );
}
