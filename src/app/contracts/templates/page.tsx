"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Section = { title: string; content: string };

const emptyForm = { key: "", name: "", isActive: true, sortOrder: 0, sections: [{ title: "", content: "" }] as Section[], defaultBlockKeys: [] as string[] };

const CATEGORY_LABELS: Record<string, string> = {
  kern: "Kern (immer enthalten)",
  kreativ: "Kreativ (automatisch bei Werkvertrag)",
  optionen: "Optionale Regelungen",
  webseiten: "Webseiten",
  design: "Design",
  marketing: "Marketing",
  wartung: "Wartung & Pflege",
};
const emptyBlockForm = { key: "", category: "webseiten", title: "", content: "", isActive: true, sortOrder: 0, isCreativeWork: false };

export default function ContractTemplatesPage() {
  const [tab, setTab] = useState<"templates" | "blocks">("templates");
  const [templates, setTemplates] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const [blocks, setBlocks] = useState<any[]>([]);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [editBlockId, setEditBlockId] = useState<string | null>(null);
  const [blockForm, setBlockForm] = useState({ ...emptyBlockForm });

  function load() {
    api.contractTemplates().then(setTemplates).catch(() => setError("Vertragsvorlagen konnten nicht geladen werden"));
  }

  function loadBlocks() {
    api.contractClauseBlocks().then(setBlocks).catch(() => setError("Leistungsbausteine konnten nicht geladen werden"));
  }

  useEffect(() => { load(); loadBlocks(); }, []);

  function startCreateBlock() {
    setEditBlockId(null);
    setBlockForm({ ...emptyBlockForm });
    setShowBlockForm(true);
  }

  function startEditBlock(b: any) {
    setEditBlockId(b.id);
    setBlockForm({ key: b.key, category: b.category, title: b.title, content: b.content, isActive: b.isActive, sortOrder: b.sortOrder, isCreativeWork: b.isCreativeWork });
    setShowBlockForm(true);
  }

  async function saveBlock() {
    if (!blockForm.title.trim() || !blockForm.content.trim()) {
      setError("Bitte Titel und Klauseltext angeben.");
      return;
    }
    try {
      if (editBlockId) {
        await api.updateContractClauseBlock(editBlockId, { category: blockForm.category, title: blockForm.title, content: blockForm.content, isActive: blockForm.isActive, sortOrder: blockForm.sortOrder, isCreativeWork: blockForm.isCreativeWork });
      } else {
        await api.createContractClauseBlock({ key: blockForm.key || blockForm.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), category: blockForm.category, title: blockForm.title, content: blockForm.content, sortOrder: blockForm.sortOrder, isCreativeWork: blockForm.isCreativeWork });
      }
      setShowBlockForm(false);
      setSuccess("Gespeichert");
      setTimeout(() => setSuccess(""), 3000);
      loadBlocks();
    } catch (e: any) {
      setError(e?.message || "Speichern fehlgeschlagen");
    }
  }

  async function removeBlock(id: string) {
    if (!confirm("Diesen Leistungsbaustein wirklich löschen?")) return;
    try {
      await api.deleteContractClauseBlock(id);
      loadBlocks();
    } catch (e: any) {
      setError(e?.message || "Löschen fehlgeschlagen");
    }
  }

  function startCreate() {
    setEditId(null);
    setForm({ ...emptyForm, sections: [{ title: "", content: "" }] });
    setShowForm(true);
  }

  function startEdit(t: any) {
    setEditId(t.id);
    setForm({ key: t.key, name: t.name, isActive: t.isActive, sortOrder: t.sortOrder, sections: t.sections?.length ? t.sections : [{ title: "", content: "" }], defaultBlockKeys: t.defaultBlockKeys || [] });
    setShowForm(true);
  }

  function toggleDefaultBlockKey(key: string) {
    setForm(cur => ({ ...cur, defaultBlockKeys: cur.defaultBlockKeys.includes(key) ? cur.defaultBlockKeys.filter(k => k !== key) : [...cur.defaultBlockKeys, key] }));
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
        await api.updateContractTemplate(editId, { name: form.name, isActive: form.isActive, sortOrder: form.sortOrder, sections, defaultBlockKeys: form.defaultBlockKeys });
      } else {
        await api.createContractTemplate({ key: form.key || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: form.name, sortOrder: form.sortOrder, sections, defaultBlockKeys: form.defaultBlockKeys });
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
          <p className="text-sm text-muted mt-0.5">Standard-Klauseln je Vertragsart sowie die einzelnen Leistungsbausteine, die im Vertrags-Assistenten als Toggles zur Auswahl stehen.</p>
        </div>
        {tab === "templates" ? (
          <button onClick={startCreate} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">+ Neue Vertragsart</button>
        ) : (
          <button onClick={startCreateBlock} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">+ Neuer Baustein</button>
        )}
      </div>

      <div className="flex gap-1 bg-background border border-border rounded-lg p-1 mb-6 w-fit">
        <button onClick={() => setTab("templates")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "templates" ? "bg-surface shadow-sm text-text" : "text-muted hover:text-text"}`}>Vertragsvorlagen</button>
        <button onClick={() => setTab("blocks")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "blocks" ? "bg-surface shadow-sm text-text" : "text-muted hover:text-text"}`}>Leistungsbausteine</button>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">×</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      {tab === "templates" && (
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
      )}

      {tab === "blocks" && (
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="px-4 py-3 text-left text-xs text-muted">Titel</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Kategorie</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Werkvertrag</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Status</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map(b => (
              <tr key={b.id} className="border-b border-border hover:bg-background">
                <td className="px-4 py-3 font-medium">{b.title}</td>
                <td className="px-4 py-3 text-sm text-muted">{CATEGORY_LABELS[b.category] || b.category}</td>
                <td className="px-4 py-3 text-sm text-muted">{b.isCreativeWork ? "Ja" : "–"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${b.isActive ? "bg-green-50 text-success" : "bg-gray-100 text-gray-500"}`}>{b.isActive ? "Aktiv" : "Inaktiv"}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => startEditBlock(b)} className="text-xs text-primary hover:underline mr-3">Bearbeiten</button>
                  <button onClick={() => removeBlock(b.id)} className="text-xs text-danger hover:underline">Löschen</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {blocks.length === 0 && <div className="p-8 text-center text-muted text-sm">Keine Leistungsbausteine vorhanden.</div>}
      </div>
      )}

      {showBlockForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBlockForm(false)}>
          <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{editBlockId ? "Baustein bearbeiten" : "Neuer Leistungsbaustein"}</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Titel</label>
                <input value={blockForm.title} onChange={e => setBlockForm({ ...blockForm, title: e.target.value })} placeholder="z.B. Spezifizierte Leistungen: Hosting" className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Kategorie</label>
                  <select value={blockForm.category} onChange={e => setBlockForm({ ...blockForm, category: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg">
                    {Object.entries(CATEGORY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input type="checkbox" checked={blockForm.isCreativeWork} onChange={e => setBlockForm({ ...blockForm, isCreativeWork: e.target.checked })} />
                  <label className="text-sm">Werkvertrag (löst Abnahme/Mängelgewährleistung/Rechteeinräumung aus)</label>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1 uppercase tracking-wide">Klauseltext</label>
                <textarea value={blockForm.content} onChange={e => setBlockForm({ ...blockForm, content: e.target.value })} rows={6} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              {editBlockId && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={blockForm.isActive} onChange={e => setBlockForm({ ...blockForm, isActive: e.target.checked })} />
                  <label className="text-sm">Aktiv</label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowBlockForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">Abbrechen</button>
              <button onClick={saveBlock} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover">Speichern</button>
            </div>
          </div>
        </div>
      )}

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

            <div className="mb-4">
              <h3 className="font-semibold text-sm mb-2">Schnellstart-Leistungen (optional)</h3>
              <p className="text-xs text-muted mb-2">Wird diese Vertragsart im Vertrags-Assistenten als Schnellstart gewählt, werden diese Leistungsbausteine automatisch vorausgewählt.</p>
              <div className="grid grid-cols-2 gap-2">
                {blocks.filter(b => !["kern", "kreativ"].includes(b.category)).map(b => (
                  <label key={b.key} className="flex items-center gap-2 text-sm border border-border rounded-lg px-3 py-2 cursor-pointer hover:bg-background">
                    <input type="checkbox" checked={form.defaultBlockKeys.includes(b.key)} onChange={() => toggleDefaultBlockKey(b.key)} />
                    {b.title}
                  </label>
                ))}
              </div>
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
