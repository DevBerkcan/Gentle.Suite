"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import UserAvatar from "@/app/components/UserAvatar";

const EMPTY_FORM = { firstName: "", lastName: "", email: "", phone: "", jobTitle: "", appUserId: "", isActive: true };

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; editing: any | null }>({ open: false, editing: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.teamMembers().then(setMembers).catch(() => setError("Mitarbeiterliste konnte nicht geladen werden"));
    api.users().then(setUsers).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setModal({ open: true, editing: null }); };
  const openEdit = (m: any) => {
    setForm({ firstName: m.firstName, lastName: m.lastName, email: m.email || "", phone: m.phone || "", jobTitle: m.jobTitle || "", appUserId: m.appUserId || "", isActive: m.isActive });
    setModal({ open: true, editing: m });
  };
  const closeModal = () => setModal({ open: false, editing: null });

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, appUserId: form.appUserId || null };
      if (modal.editing) {
        await api.updateTeamMember(modal.editing.id, payload);
      } else {
        await api.createTeamMember(payload);
      }
      load();
      closeModal();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: any) => {
    if (!confirm(`Mitarbeiter "${m.firstName} ${m.lastName}" wirklich löschen?`)) return;
    try {
      await api.deleteTeamMember(m.id);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filtered = members.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (m.firstName + " " + m.lastName).toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.jobTitle?.toLowerCase().includes(q);
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mitarbeiter</h1>
        <div className="flex items-center gap-3">
          <input placeholder="Suche..." value={search} onChange={e => setSearch(e.target.value)} className="px-3 py-1.5 border border-border rounded-lg text-sm w-48" />
          <button onClick={openCreate} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">+ Mitarbeiter</button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">×</button></div>}

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="px-4 py-3 text-left text-xs text-muted">Name</th>
              <th className="px-4 py-3 text-left text-xs text-muted">E-Mail</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Telefon</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Position</th>
              <th className="px-4 py-3 text-left text-xs text-muted">System-Login</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m: any) => (
              <tr key={m.id} className="border-b border-border hover:bg-background/50">
                <td className="px-4 py-3 text-sm font-medium">
                  <div className="flex items-center gap-3">
                    <UserAvatar avatarUrl={m.appUserId ? users.find((u: any) => u.id === m.appUserId)?.avatarUrl : null} name={`${m.firstName} ${m.lastName}`} sizeClass="w-8 h-8 text-xs" />
                    <span>{m.firstName} {m.lastName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted">{m.email || "–"}</td>
                <td className="px-4 py-3 text-sm text-muted">{m.phone || "–"}</td>
                <td className="px-4 py-3 text-sm">{m.jobTitle || "–"}</td>
                <td className="px-4 py-3 text-sm">
                  {m.appUserId ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Verknüpft</span> : <span className="text-xs text-muted">Kein Login</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${m.isActive ? "bg-green-50 text-success" : "bg-gray-100 text-muted"}`}>{m.isActive ? "Aktiv" : "Inaktiv"}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(m)} className="text-xs text-primary mr-3 hover:underline">Bearbeiten</button>
                  <button onClick={() => handleDelete(m)} className="text-xs text-danger hover:underline">Löschen</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-muted text-sm">Keine Mitarbeiter vorhanden.</div>}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-4">{modal.editing ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted mb-1">Vorname *</label>
                <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Nachname</label>
                <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">E-Mail</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Telefon</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted mb-1">Position / Jobbezeichnung</label>
                <input value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted mb-1">System-Login verknüpfen (optional)</label>
                <select value={form.appUserId} onChange={e => setForm(f => ({ ...f, appUserId: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                  <option value="">Kein Login</option>
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
                </select>
              </div>
              {modal.editing && (
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
                  <label htmlFor="isActive" className="text-sm">Aktiv</label>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} className="px-4 py-2 border border-border rounded-lg text-sm">Abbrechen</button>
              <button onClick={handleSave} disabled={saving || !form.firstName} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Speichern..." : "Speichern"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
