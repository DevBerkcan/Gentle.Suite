"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const TYPE_LABELS: Record<string, string> = {
  Agb: "AGB",
  Datenschutz: "Datenschutz",
  Vertrag: "Vertrag",
  Sonstiges: "Sonstiges",
};
const TYPES = ["Agb", "Datenschutz", "Vertrag", "Sonstiges"];

const emptyForm = { key: "", title: "", content: "", sortOrder: 0, type: "Sonstiges", autoAttachToQuotes: false };

export default function LegalTextsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);
  function load() { api.legalTexts().then(setItems).catch(() => setError("Rechtliches konnte nicht geladen werden")); }

  function startEdit(item: any) {
    setEditId(item.id);
    setForm({ key: item.key, title: item.title, content: item.content, sortOrder: item.sortOrder, type: item.type, autoAttachToQuotes: !!item.autoAttachToQuotes });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editId) await api.updateLegalText(editId, form);
      else await api.createLegalText(form);
      setShowForm(false); setEditId(null);
      setForm({ ...emptyForm });
      setSuccess(editId ? "Dokument aktualisiert" : "Dokument erstellt");
      setTimeout(() => setSuccess(""), 3000);
      load();
    } catch { setError("Fehler beim Speichern"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Dokument wirklich löschen?")) return;
    try { await api.deleteLegalText(id); load(); } catch { setError("Fehler beim Löschen"); }
  }

  async function handleUpload(id: string, file: File) {
    setUploadingId(id);
    try {
      await api.uploadLegalTextAttachment(id, file);
      setSuccess("Datei hochgeladen");
      setTimeout(() => setSuccess(""), 3000);
      load();
    } catch {
      setError("Fehler beim Hochladen der Datei");
    } finally {
      setUploadingId(null);
    }
  }

  async function handleRemoveAttachment(id: string) {
    if (!confirm("Hochgeladene Datei wirklich entfernen?")) return;
    try { await api.deleteLegalTextAttachment(id); load(); } catch { setError("Fehler beim Entfernen der Datei"); }
  }

  async function handleViewAttachment(id: string) {
    try {
      const blob = await api.legalTextAttachmentBlob(id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      setError("Datei konnte nicht geladen werden");
    }
  }

  const grouped = TYPES.map(t => ({ type: t, items: items.filter(i => i.type === t) }));

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Rechtliches</h1>
          <p className="text-sm text-muted mt-0.5">AGB, Datenschutz und Verträge — als Text oder Datei-Upload, AGB/Datenschutz können automatisch an jedes Angebot angehängt werden</p>
        </div>
        <button onClick={() => { setEditId(null); setForm({ ...emptyForm }); setShowForm(true); }} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">+ Neues Dokument</button>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">×</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      {grouped.map(g => (
        <div key={g.type} className="mb-8">
          <h2 className="font-semibold mb-3">{TYPE_LABELS[g.type]}</h2>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="px-4 py-3 text-left text-xs text-muted">Key</th>
                  <th className="px-4 py-3 text-left text-xs text-muted">Titel</th>
                  <th className="px-4 py-3 text-left text-xs text-muted">Inhalt / Datei</th>
                  <th className="px-4 py-3 text-left text-xs text-muted">Automatisch anhängen</th>
                  <th className="px-4 py-3 text-right text-xs text-muted">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((item: any) => (
                  <tr key={item.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 font-medium text-sm">{item.key}</td>
                    <td className="px-4 py-3 text-sm">{item.title}</td>
                    <td className="px-4 py-3 text-sm text-muted max-w-xs">
                      {item.attachmentFileName ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleViewAttachment(item.id)} className="text-primary hover:underline truncate text-left">{item.attachmentFileName}</button>
                          <button onClick={() => handleRemoveAttachment(item.id)} className="text-xs text-danger hover:underline shrink-0">entfernen</button>
                        </div>
                      ) : (
                        <span className="truncate block">{item.content || "–"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.autoAttachToQuotes ? <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-success">Ja</span> : <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">Nein</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        id={`upload-${item.id}`}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(item.id, f); e.target.value = ""; }}
                      />
                      <label htmlFor={`upload-${item.id}`} className="text-xs text-primary hover:underline mr-2 cursor-pointer">
                        {uploadingId === item.id ? "Lädt hoch..." : item.attachmentFileName ? "Datei ersetzen" : "PDF hochladen"}
                      </label>
                      <button onClick={() => startEdit(item)} className="text-xs text-primary hover:underline mr-2">Bearbeiten</button>
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-danger hover:underline">Löschen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {g.items.length === 0 && <div className="p-6 text-center text-muted text-sm">Keine Dokumente in dieser Kategorie.</div>}
          </div>
        </div>
      ))}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-surface rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{editId ? "Dokument bearbeiten" : "Neues Dokument"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Typ *</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                  {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Key *</label><input required value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="z.B. agb_standard" className="w-full px-3 py-2 border border-border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Titel *</label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" /></div>
              <div>
                <label className="block text-sm font-medium mb-1">Inhalt</label>
                <textarea rows={6} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Text hier eingeben, oder nach dem Speichern eine PDF-Datei hochladen (ersetzt den Text im Angebot)" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                <p className="mt-1 text-xs text-muted">Alternativ kann nach dem Speichern eine PDF-Datei hochgeladen werden (z. B. dein fertiges AGB-Dokument) — die geht dann statt des Texts als Anhang mit raus.</p>
              </div>
              <div><label className="block text-sm font-medium mb-1">Sortierung</label><input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" /></div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5" checked={form.autoAttachToQuotes} onChange={e => setForm({ ...form, autoAttachToQuotes: e.target.checked })} />
                <span>Automatisch an jedes Angebot anhängen (typisch für AGB/Datenschutz — muss dann nicht mehr manuell ausgewählt werden)</span>
              </label>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Speichern</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Abbrechen</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
