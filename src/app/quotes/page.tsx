"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const statusMap: Record<string, { label: string; cls: string }> = {
  Draft: { label: "Entwurf", cls: "bg-gray-100 text-muted" },
  Sent: { label: "Gesendet", cls: "bg-blue-50 text-blue-700" },
  Viewed: { label: "Angesehen", cls: "bg-blue-50 text-blue-700" },
  Accepted: { label: "Angenommen", cls: "bg-green-50 text-success" },
  Ordered: { label: "Auftrag", cls: "bg-purple-50 text-purple-700" },
  Rejected: { label: "Abgelehnt", cls: "bg-red-50 text-danger" },
  Inactive: { label: "Nicht aktiv", cls: "bg-gray-100 text-muted" },
  Expired: { label: "Abgelaufen", cls: "bg-yellow-50 text-warning" },
};

const sigMap: Record<string, string> = {
  Pending: "Ausstehend", Signed: "Unterschrieben", Declined: "Abgelehnt",
};

export default function QuotesPage() {
  const [data, setData] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [newQuote, setNewQuote, clearNewQuote] = useLocalStorage("draft:quote-create", { customerId: "", templateId: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");

  function buildParams() {
    const parts: string[] = [];
    if (statusFilter) parts.push(`status=${statusFilter}`);
    if (customerFilter) parts.push(`customerId=${customerFilter}`);
    return parts.join("&");
  }

  function loadQuotes(params?: string) { api.quotes(params ?? buildParams()).then(setData).catch(() => setError("Angebote konnten nicht geladen werden")); }

  useEffect(() => {
    loadQuotes();
    api.customers().then(d => setCustomers(d.items || []));
    api.quoteTemplates().then(setTemplates).catch(() => {});
  }, []);

  useEffect(() => { loadQuotes(); }, [statusFilter, customerFilter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!newQuote.customerId) nextErrors.customerId = "Bitte einen Kunden auswaehlen.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      if (newQuote.templateId) {
        await api.createQuote({ customerId: newQuote.customerId, templateId: newQuote.templateId });
      } else {
        await api.createQuote({ customerId: newQuote.customerId });
      }
      setShowNew(false);
      clearNewQuote();
      setFieldErrors({});
      setError("");
      setSuccess("Angebot erfolgreich erstellt");
      setTimeout(() => setSuccess(""), 4000);
      loadQuotes();
    } catch (e: any) { setError(e?.message || "Fehler beim Erstellen des Angebots"); }
  }

  async function deactivate(id: string) {
    setDeactivatingId(id); setError(""); setSuccess("");
    try { await api.deactivateQuote(id); setSuccess("Angebot wurde auf nicht aktiv gesetzt."); loadQuotes(); }
    catch (e: any) { setError(e?.message || "Angebot konnte nicht deaktiviert werden."); }
    finally { setDeactivatingId(null); }
  }

  const s = (status: string) => statusMap[status] || { label: status, cls: "bg-gray-100 text-muted" };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Angebote</h1>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 border border-border rounded-lg text-sm">
            <option value="">Alle Status</option>
            <option value="Draft">Entwurf</option>
            <option value="Sent">Gesendet</option>
            <option value="Viewed">Angesehen</option>
            <option value="Expired">Abgelaufen</option>
            <option value="Inactive">Nicht aktiv</option>
            <option value="Accepted">Angenommen</option>
            <option value="Ordered">Auftrag</option>
            <option value="Rejected">Abgelehnt</option>
          </select>
          <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} className="px-3 py-1.5 border border-border rounded-lg text-sm">
            <option value="">Alle Kunden</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </select>
        </div>
        <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">+ Neues Angebot</button>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">x</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-background"><th className="px-4 py-3 text-left text-xs text-muted">Nr.</th><th className="px-4 py-3 text-left text-xs text-muted">Kunde</th><th className="px-4 py-3 text-left text-xs text-muted">Status</th><th className="px-4 py-3 text-left text-xs text-muted">Signatur</th><th className="px-4 py-3 text-right text-xs text-muted">Betrag</th><th className="px-4 py-3 text-left text-xs text-muted">Datum</th><th className="px-4 py-3 text-left text-xs text-muted">Gültig bis</th><th className="px-4 py-3 text-left text-xs text-muted">Aktion</th></tr></thead>
          <tbody>{data?.items?.map((q: any) => (
            <tr key={q.id} className="border-b border-border hover:bg-background cursor-pointer" onClick={() => window.location.href = `/quotes/${q.id}`}>
              <td className="px-4 py-3 font-medium">{q.quoteNumber}</td>
              <td className="px-4 py-3">{q.customerName}</td>
              <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${s(q.status).cls}`}>{s(q.status).label}</span></td>
              <td className="px-4 py-3"><span className={`text-xs ${q.signatureStatus === "Signed" ? "text-success" : "text-muted"}`}>{sigMap[q.signatureStatus] || q.signatureStatus}</span></td>
              <td className="px-4 py-3 text-right font-medium">{q.grandTotal?.toFixed(2)} EUR</td>
              <td className="px-4 py-3 text-sm text-muted">{new Date(q.createdAt).toLocaleDateString("de")}</td>
              <td className="px-4 py-3 text-sm text-muted">{q.expiresAt ? new Date(q.expiresAt).toLocaleDateString("de-DE") : "–"}</td>
              <td className="px-4 py-3">{["Draft", "Sent", "Viewed"].includes(q.status) && <button disabled={deactivatingId !== null} onClick={e => { e.stopPropagation(); void deactivate(q.id); }} className="px-3 py-1.5 border border-border rounded-lg text-sm disabled:opacity-50">{deactivatingId === q.id ? "Wird deaktiviert..." : "Nicht aktiv"}</button>}</td>
            </tr>
          ))}</tbody>
        </table>
        {data?.items?.length === 0 && <div className="p-8 text-center text-muted text-sm">Keine Angebote vorhanden.</div>}
      </div>
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNew(false)}>
          <div className="bg-surface rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Neues Angebot</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Kunde *</label>
                <select required value={newQuote.customerId} onChange={e => { setNewQuote({...newQuote, customerId: e.target.value}); setFieldErrors(prev => ({ ...prev, customerId: "" })); }} className="w-full px-3 py-2 border border-border rounded-lg">
                  <option value="">Waehlen...</option>{customers.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
                {fieldErrors.customerId && <p className="text-xs text-danger mt-1">{fieldErrors.customerId}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vorlage</label>
                <select value={newQuote.templateId} onChange={e => setNewQuote({...newQuote, templateId: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg">
                  <option value="">Keine Vorlage (leer)</option>{templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2"><button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Erstellen</button><button type="button" onClick={() => { setShowNew(false); setFieldErrors({}); }} className="px-4 py-2 border border-border rounded-lg text-sm">Abbrechen</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
