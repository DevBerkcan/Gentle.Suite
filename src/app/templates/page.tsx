"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const emptyLine = () => ({ title: "", description: "", quantity: 1, unitPrice: 0, lineType: "OneTime", sortOrder: 0 });

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modal, setModal] = useState<{ id?: string; name: string; description: string; lines: any[] } | null>(null);

  const load = () => api.quoteTemplates().then(setTemplates).catch(() => setError("Vorlagen konnten nicht geladen werden"));
  useEffect(() => { load(); }, []);

  const openNew = () => setModal({ name: "", description: "", lines: [emptyLine()] });
  const openEdit = (t: any) => setModal({ id: t.id, name: t.name, description: t.description || "", lines: t.lines?.length > 0 ? t.lines.map((l: any) => ({ title: l.title, description: l.description || "", quantity: l.quantity, unitPrice: l.unitPrice, lineType: l.lineType, sortOrder: l.sortOrder })) : [emptyLine()] });

  const updateLine = (idx: number, field: string, val: any) => { if (!modal) return; const l = [...modal.lines]; l[idx] = { ...l[idx], [field]: val }; setModal({ ...modal, lines: l }); };
  const removeLine = (idx: number) => { if (!modal) return; setModal({ ...modal, lines: modal.lines.filter((_, i) => i !== idx) }); };
  const addLine = () => { if (!modal) return; setModal({ ...modal, lines: [...modal.lines, emptyLine()] }); };

  const save = async () => {
    if (!modal) return;
    try {
      const data = { name: modal.name, description: modal.description || undefined, lines: modal.lines.map((l, i) => ({ ...l, sortOrder: i })) };
      if (modal.id) await api.updateQuoteTemplate(modal.id, data);
      else await api.createQuoteTemplate(data);
      setModal(null); setSuccess("Gespeichert"); setTimeout(() => setSuccess(""), 3000); load();
    } catch (e: any) { setError(e.message); }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Vorlage wirklich loeschen?")) return;
    try { await api.deleteQuoteTemplate(id); load(); } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Angebotsvorlagen</h1>
        <button onClick={openNew} className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:opacity-90">+ Neue Vorlage</button>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">x</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-background"><th className="px-4 py-3 text-left text-xs text-muted">Name</th><th className="px-4 py-3 text-left text-xs text-muted">Beschreibung</th><th className="px-4 py-3 text-right text-xs text-muted">Positionen</th><th className="px-4 py-3 text-right text-xs text-muted">Aktionen</th></tr></thead>
          <tbody>{templates.map((t: any) => (
            <tr key={t.id} className="border-b border-border">
              <td className="px-4 py-3 font-medium">{t.name}</td>
              <td className="px-4 py-3 text-sm text-muted">{t.description || "–"}</td>
              <td className="px-4 py-3 text-right text-sm">{t.lines?.length || 0}</td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => openEdit(t)} className="text-xs text-primary hover:underline mr-2">Bearbeiten</button>
                <button onClick={() => deleteTemplate(t.id)} className="text-xs text-danger hover:underline">Loeschen</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {templates.length === 0 && <div className="p-8 text-center text-muted text-sm">Keine Vorlagen vorhanden.</div>}
      </div>

      {modal && <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-10 z-50 overflow-auto">
        <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-3xl shadow-xl mb-10">
          <h2 className="text-lg font-bold mb-4">{modal.id ? "Vorlage bearbeiten" : "Neue Vorlage"}</h2>
          <div className="space-y-3 mb-4">
            <div><label className="text-xs text-muted block mb-1">Name</label><input value={modal.name} onChange={e => setModal({...modal, name: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" /></div>
            <div><label className="text-xs text-muted block mb-1">Beschreibung</label><textarea value={modal.description} onChange={e => setModal({...modal, description: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" rows={2} /></div>
          </div>
          <h3 className="font-semibold text-sm mb-2">Positionen</h3>
          <div className="space-y-2">
            {modal.lines.map((l: any, idx: number) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">{idx === 0 && <label className="text-xs text-muted">Titel</label>}<input value={l.title} onChange={e => updateLine(idx, "title", e.target.value)} className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background" /></div>
                <div className="col-span-2">{idx === 0 && <label className="text-xs text-muted">Menge</label>}<input type="number" step="0.01" value={l.quantity} onChange={e => updateLine(idx, "quantity", +e.target.value)} className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background" /></div>
                <div className="col-span-2">{idx === 0 && <label className="text-xs text-muted">Preis</label>}<input type="number" step="0.01" value={l.unitPrice} onChange={e => updateLine(idx, "unitPrice", +e.target.value)} className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background" /></div>
                <div className="col-span-2">{idx === 0 && <label className="text-xs text-muted">Typ</label>}<select value={l.lineType} onChange={e => updateLine(idx, "lineType", e.target.value)} className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"><option value="OneTime">Einmalig</option><option value="RecurringMonthly">Monatlich</option></select></div>
                <div className="col-span-1 text-right text-sm font-medium pt-1">{(l.quantity * l.unitPrice).toFixed(2)}</div>
                <div className="col-span-1"><button onClick={() => removeLine(idx)} className="text-danger text-sm">x</button></div>
              </div>
            ))}
          </div>
          <button onClick={addLine} className="text-primary text-sm mt-2 hover:underline">+ Position</button>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-border rounded-lg">Abbrechen</button>
            <button onClick={save} className="bg-primary text-white px-4 py-2 rounded-lg text-sm">Speichern</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
