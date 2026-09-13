"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const contractStatusMap: Record<string, { label: string; cls: string }> = {
  Draft: { label: "Entwurf", cls: "bg-gray-100 text-gray-700" },
  SentForSignature: { label: "Wartet auf Unterschrift", cls: "bg-orange-50 text-orange-700" },
  FullyExecuted: { label: "Abgeschlossen", cls: "bg-green-50 text-success" },
  Declined: { label: "Abgelehnt", cls: "bg-red-50 text-danger" },
};

const columns = [
  { kind: "quote", label: "Angebote", accent: "border-t-blue-400" },
  { kind: "subscription", label: "Serienrechnungen", accent: "border-t-purple-400" },
  { kind: "installment", label: "Ratenzahlungen", accent: "border-t-orange-400" },
];

function daysSince(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  return days <= 0 ? "heute" : days === 1 ? "seit 1 Tag" : `seit ${days} Tagen`;
}

export default function ContractsDashboardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [creatingFor, setCreatingFor] = useState<any | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([api.contractTriage(), api.contractTemplates()])
      .then(([triage, tpl]) => { setItems(triage); setTemplates(tpl); })
      .catch(() => setError("Übersicht konnte nicht geladen werden"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function createContract() {
    if (!creatingFor || !selectedTemplateId) return;
    setCreating(true);
    try {
      const req: any = { contractTemplateId: selectedTemplateId };
      if (creatingFor.kind === "quote") req.quoteId = creatingFor.id;
      else req.subscriptionId = creatingFor.id;
      const contract = await api.createAgencyContract(req);
      window.location.href = `/contracts/${contract.id}`;
    } catch (e: any) {
      setError(e?.message || "Vertrag konnte nicht angelegt werden");
      setCreating(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Verträge — Übersicht</h1>
        <p className="text-sm text-muted mt-0.5">Wofür aktuell ein Agenturvertrag vorbereitet oder unterschrieben werden muss, bevor die Rechnung gestellt werden kann.</p>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">×</button></div>}

      {creatingFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setCreatingFor(null)}>
          <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-1">Vertrag erstellen</h2>
            <p className="text-sm text-muted mb-4">{creatingFor.customerName} — {creatingFor.title}</p>
            <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Vertragsart</label>
            <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg mb-4">
              <option value="">Bitte wählen...</option>
              {templates.filter(t => t.isActive).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCreatingFor(null)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">Abbrechen</button>
              <button onClick={createContract} disabled={!selectedTemplateId || creating} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
                {creating ? "Wird angelegt..." : "Anlegen"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(col => {
          const colItems = items.filter(i => i.kind === col.kind);
          return (
            <div key={col.kind} className={`bg-surface border border-border rounded-xl border-t-4 ${col.accent}`}>
              <div className="p-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold">{col.label}</span>
                <span className="text-xs text-muted bg-background px-2 py-0.5 rounded-full">{colItems.length}</span>
              </div>
              <div className="p-2 space-y-2 min-h-[200px]">
                {colItems.map(item => (
                  <div key={item.id} className="bg-background border border-border rounded-lg p-3">
                    <div className="font-medium text-sm">{item.customerName}</div>
                    <div className="text-xs text-muted mt-0.5">{item.title}</div>
                    {item.reference && <div className="text-xs text-muted">{item.reference}</div>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted">{daysSince(item.sinceDate)}</span>
                      {item.agencyContractId ? (
                        <Link href={`/contracts/${item.agencyContractId}`} className={`text-xs px-2 py-1 rounded-full ${contractStatusMap[item.contractStatus]?.cls || "bg-gray-100 text-gray-700"}`}>
                          {contractStatusMap[item.contractStatus]?.label || item.contractStatus}
                        </Link>
                      ) : (
                        <button
                          onClick={() => { setCreatingFor(item); setSelectedTemplateId(""); }}
                          className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-hover"
                        >
                          Vertrag erstellen
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!loading && colItems.length === 0 && (
                  <div className="p-4 text-center text-muted text-xs">Nichts offen</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
