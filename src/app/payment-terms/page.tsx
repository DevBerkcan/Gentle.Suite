"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function PaymentTermsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ key: "", title: "", content: "", sortOrder: 0 });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { load(); }, []);
  function load() { api.paymentTerms().then(setItems).catch(() => setError("Zahlungsbedingungen konnten nicht geladen werden")); }

  function startEdit(item: any) {
    setEditId(item.id);
    setForm({ key: item.key, title: item.title, content: item.content, sortOrder: item.sortOrder });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editId) await api.updatePaymentTerm(editId, form);
      else await api.createPaymentTerm(form);
      setShowForm(false); setEditId(null);
      setForm({ key: "", title: "", content: "", sortOrder: 0 });
      setSuccess(editId ? "Zahlungsbedingung aktualisiert" : "Zahlungsbedingung erstellt");
      setTimeout(() => setSuccess(""), 3000);
      load();
    } catch { setError("Fehler beim Speichern"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Zahlungsbedingung wirklich loeschen?")) return;
    try { await api.deletePaymentTerm(id); load(); } catch { setError("Fehler beim Loeschen"); }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Zahlungsbedingungen</h1>
          <p className="text-sm text-muted mt-1">Katalog der Zahlungsbedingungen, aus denen im Angebot mehrere ausgewählt werden können. Der Kunde wählt beim Unterschreiben eine davon aus.</p>
        </div>
        <button onClick={() => { setEditId(null); setForm({ key: "", title: "", content: "", sortOrder: 0 }); setShowForm(true); }} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">+ Neue Zahlungsbedingung</button>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">x</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-background"><th className="px-4 py-3 text-left text-xs text-muted">Key</th><th className="px-4 py-3 text-left text-xs text-muted">Titel</th><th className="px-4 py-3 text-left text-xs text-muted">Inhalt</th><th className="px-4 py-3 text-right text-xs text-muted">Sortierung</th><th className="px-4 py-3 text-right text-xs text-muted">Aktionen</th></tr></thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} className="border-b border-border">
                <td className="px-4 py-3 font-medium text-sm">{item.key}</td>
                <td className="px-4 py-3 text-sm">{item.title}</td>
                <td className="px-4 py-3 text-sm text-muted max-w-xs truncate">{item.content}</td>
                <td className="px-4 py-3 text-sm text-right">{item.sortOrder}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(item)} className="text-xs text-primary hover:underline mr-2">Bearbeiten</button>
                  <button onClick={() => handleDelete(item.id)} className="text-xs text-danger hover:underline">Loeschen</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="p-8 text-center text-muted text-sm">Keine Zahlungsbedingungen vorhanden.</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-surface rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{editId ? "Zahlungsbedingung bearbeiten" : "Neue Zahlungsbedingung"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Key *</label><input required value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="z.B. vorkasse" className="w-full px-3 py-2 border border-border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Titel *</label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="z.B. 100% Vorkasse" className="w-full px-3 py-2 border border-border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Beschreibung *</label><textarea required rows={4} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-y" /></div>
              <div><label className="block text-sm font-medium mb-1">Sortierung</label><input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" /></div>
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
