"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Section = { title: string; content: string };

const emptyForm = { key: "", name: "", isActive: true, sortOrder: 0, sections: [{ title: "", content: "" }] as Section[] };

export default function ContractTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  function load() {
    api.contractTemplates().then(setTemplates).catch(() => setError("Vertragsvorlagen konnten nicht geladen werden"));
  }

  useEffect(() => { load(); }, []);

  function startCreate() {
    setEditId(null);
    setForm({ ...emptyForm, sections: [{ title: "", content: "" }] });
    setShowForm(true);
  }

  function startEdit(t: any) {
    setEditId(t.id);
    setForm({ key: t.key, name: t.name, isActive: t.isActive, sortOrder: t.sortOrder, sections: t.sections?.length ? t.sections : [{ title: "", content: "" }] });
    setShowForm(true);
  }

  function updateSection(i: number, field: "title" | "content", value: string) {
    const next = [...form.sections];
    next[i] = { ...next[i], [field]: value };
    setForm({ ...form, sections: next });
  }

  function addSection() {
    setForm({ ...form, sections: [...form.sections, { title: "", content: "" }] });
  }

  function removeSection(i: number) {
    setForm({ ...form, sections: form.sections.filter((_, idx) => idx !== i) });
  }

  async function save() {
    if (!form.name.trim() || !form.sections.some(s => s.title.trim())) {
      setError("Bitte einen Namen und mindestens einen Abschnitt mit Titel angeben.");
      return;
    }
    try {
      const sections = form.sections.filter(s => s.title.trim());
      if (editId) {
        await api.updateContractTemplate(editId, { name: form.name, isActive: form.isActive, sortOrder: form.sortOrder, sections });
      } else {
        await api.createContractTemplate({ key: form.key || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: form.name, sortOrder: form.sortOrder, sections });
      }
      setShowForm(false);
      setSuccess("Gespeichert");
      setTimeout(() => setSuccess(""), 3000);
      load();
    } catch (e: any) {
      setError(e?.message || "Speichern fehlgeschlagen");
    }
  }

  async function remove(id: string) {
    if (!confirm("Diese Vertragsvorlage wirklich löschen?")) return;
    try {
      await api.deleteContractTemplate(id);
      load();
    } catch (e: any) {
      setError(e?.message || "Löschen fehlgeschlagen");
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Vertragsvorlagen</h1>
          <p className="text-sm text-muted mt-0.5">Standard-Klauseln je Vertragsart (Wartungsvertrag, SEO-Vertrag, Webdesign-Vertrag, ...) — beim Anlegen eines Vertrags editierbar vorbefüllt.</p>
        </div>
        <button onClick={startCreate} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">+ Neue Vertragsart</button>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">×</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="px-4 py-3 text-left text-xs text-muted">Name</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Abschnitte</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Status</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {templates.map(t => (
              <tr key={t.id} className="border-b border-border hover:bg-background">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-sm text-muted">{t.sections?.length || 0} Abschnitte</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${t.isActive ? "bg-green-50 text-success" : "bg-gray-100 text-gray-500"}`}>{t.isActive ? "Aktiv" : "Inaktiv"}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => startEdit(t)} className="text-xs text-primary hover:underline mr-3">Bearbeiten</button>
                  <button onClick={() => remove(t.id)} className="text-xs text-danger hover:underline">Löschen</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {templates.length === 0 && <div className="p-8 text-center text-muted text-sm">Keine Vertragsvorlagen vorhanden.</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{editId ? "Vertragsart bearbeiten" : "Neue Vertragsart"}</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Wartungsvertrag" className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                <label className="text-sm">Aktiv</label>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Abschnitte (Klauseln)</h3>
              <button onClick={addSection} className="text-xs text-primary hover:underline">+ Abschnitt hinzufügen</button>
            </div>

            <div className="space-y-3 mb-4">
              {form.sections.map((s, i) => (
                <div key={i} className="border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      value={s.title}
                      onChange={e => updateSection(i, "title", e.target.value)}
                      placeholder="Titel des Abschnitts"
                      className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm font-medium"
                    />
                    <button onClick={() => removeSection(i)} className="text-danger hover:underline text-xs px-2">Entfernen</button>
                  </div>
                  <textarea
                    value={s.content}
                    onChange={e => updateSection(i, "content", e.target.value)}
                    placeholder="Klauseltext..."
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">Abbrechen</button>
              <button onClick={save} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover">Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
