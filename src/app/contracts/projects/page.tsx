"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, Search } from "lucide-react";
import { api } from "@/lib/api";

const quoteStatusLabel: Record<string, string> = {
  Draft: "Entwurf", Sent: "Versendet", Viewed: "Angesehen", Accepted: "Angenommen", Rejected: "Abgelehnt", Expired: "Abgelaufen", Ordered: "Beauftragt", Inactive: "Inaktiv",
};

type Filter = "open" | "done" | "all";

export default function LegalWorkflowListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("open");
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.legalWorkflows().then(setItems).catch(e => setError(e?.message || "Übersicht konnte nicht geladen werden")).finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter(i => filter === "all" || (filter === "done" ? i.doneSteps === i.totalSteps : i.doneSteps < i.totalSteps))
      .filter(i => !q || `${i.customerName} ${i.quoteNumber} ${i.subject || ""}`.toLowerCase().includes(q));
  }, [items, filter, query]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Projekt-Ablauf</h1>
        <p className="mt-0.5 text-sm text-muted">Rechtliche Schritte pro Projekt: Angebot mit AGB, Agenturvertrag, AV-Vertrag, Rechtstexte, Urheberrechte und Abnahme.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border bg-surface p-0.5 text-sm">
          {([["open", "Offen"], ["done", "Erledigt"], ["all", "Alle"]] as [Filter, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-md px-3 py-1.5 ${filter === k ? "bg-primary text-white" : "text-muted hover:text-text"}`}>{l}</button>
          ))}
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Kunde, Angebot …" className="rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm" />
        </label>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-danger">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {loading ? <p className="p-6 text-sm text-muted">Lädt …</p> : visible.length === 0 ? <p className="p-6 text-sm text-muted">Keine Projekte in dieser Ansicht.</p> : (
          <ul className="divide-y divide-border">
            {visible.map(i => {
              const pct = Math.round((i.doneSteps / i.totalSteps) * 100);
              const complete = i.doneSteps === i.totalSteps;
              return (
                <li key={i.quoteId}>
                  <Link href={`/contracts/projects/${i.quoteId}`} className="flex items-center gap-4 px-4 py-3 hover:bg-background">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{i.customerName}</span>
                        {i.hasProblem && <AlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-label="Problem" />}
                        {complete && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label="Erledigt" />}
                      </div>
                      <div className="truncate text-xs text-muted">{i.quoteNumber}{i.subject ? ` · ${i.subject}` : ""} · {quoteStatusLabel[i.quoteStatus] || i.quoteStatus}</div>
                    </div>
                    <div className="hidden w-56 shrink-0 sm:block">
                      <div className="mb-1 flex justify-between text-xs text-muted"><span>{i.doneSteps} von {i.totalSteps}</span><span className="truncate pl-2">{complete ? "Alles erledigt" : `Weiter: ${i.nextStep}`}</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-background"><div className={`h-full rounded-full ${complete ? "bg-success" : "bg-accent"}`} style={{ width: `${pct}%` }} /></div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
