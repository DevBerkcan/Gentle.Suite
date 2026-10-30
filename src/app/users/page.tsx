"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import UserAvatar from "@/app/components/UserAvatar";
import AvatarEditor from "@/app/components/AvatarEditor";
import { getStoredUser, updateStoredUser } from "@/lib/currentUser";
import type { UserAccount } from "@/types/api";

const roles = ["Admin", "Projektmanager", "Designer", "Entwickler", "Marketing", "Buchhaltung"];
const defaultForm = { email: "", firstName: "", lastName: "", password: "", roles: [] as string[] };

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", isActive: true, roles: [] as string[] });
  const [pwId, setPwId] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");

  const load = () => api.users().then(setUsers).catch(() => setError("Benutzer konnten nicht geladen werden"));
  useEffect(() => { load(); }, []);

  const toggleRole = (r: string, current: string[]) => current.includes(r) ? current.filter(x => x !== r) : [...current, r];

  const create = async () => {
    try { await api.createUser(form); setShowNew(false); setForm(defaultForm); setSuccess("Benutzer angelegt"); setTimeout(() => setSuccess(""), 3000); load(); } catch (e: any) { setError(e.message); }
  };

  const startEdit = (u: any) => { setEditId(u.id); setEditForm({ firstName: u.firstName, lastName: u.lastName, isActive: u.isActive, roles: u.roles || [] }); };

  const saveEdit = async () => {
    if (!editId) return;
    try { await api.updateUser(editId, editForm); setEditId(null); setSuccess("Gespeichert"); setTimeout(() => setSuccess(""), 3000); load(); } catch (e: any) { setError(e.message); }
  };

  const resetPw = async () => {
    if (!pwId || !newPw) return;
    try { await api.resetUserPassword(pwId, { newPassword: newPw }); setPwId(null); setNewPw(""); setSuccess("Passwort zurueckgesetzt"); setTimeout(() => setSuccess(""), 3000); } catch (e: any) { setError(e.message); }
  };

  // Profilbild im Bearbeiten-Dialog geändert: Liste aktualisieren, bei eigenem Konto auch den Header.
  const handleAvatarChanged = (u: UserAccount) => {
    setUsers((list) => list.map((x: any) => (x.id === u.id ? { ...x, avatarUrl: u.avatarUrl ?? null } : x)));
    if (getStoredUser()?.userId === u.id) updateStoredUser({ avatarUrl: u.avatarUrl ?? null });
  };
  const editUser = editId ? users.find((u: any) => u.id === editId) : null;

  const deactivate = async (id: string) => {
    if (!confirm("Benutzer wirklich deaktivieren?")) return;
    try { await api.deleteUser(id); load(); } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Team</h1>
        <button onClick={() => { setForm(defaultForm); setShowNew(true); }} className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:opacity-90">+ Neuer Benutzer</button>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">x</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-background"><th className="px-4 py-3 text-left text-xs text-muted">Name</th><th className="px-4 py-3 text-left text-xs text-muted">E-Mail</th><th className="px-4 py-3 text-left text-xs text-muted">Rollen</th><th className="px-4 py-3 text-left text-xs text-muted">Status</th><th className="px-4 py-3 text-right text-xs text-muted">Aktionen</th></tr></thead>
          <tbody>{users.map((u: any) => (
            <tr key={u.id} className="border-b border-border">
              <td className="px-4 py-3 font-medium"><div className="flex items-center gap-3"><UserAvatar avatarUrl={u.avatarUrl} name={`${u.firstName} ${u.lastName}`} sizeClass="w-8 h-8 text-xs" /><span>{u.firstName} {u.lastName}</span></div></td>
              <td className="px-4 py-3 text-sm">{u.email}</td>
              <td className="px-4 py-3"><div className="flex gap-1 flex-wrap">{u.roles?.map((r: string) => <span key={r} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">{r}</span>)}</div></td>
              <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${u.isActive ? "bg-green-50 text-success" : "bg-gray-100 text-muted"}`}>{u.isActive ? "Aktiv" : "Inaktiv"}</span></td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => startEdit(u)} className="text-xs text-primary hover:underline mr-2">Bearbeiten</button>
                <button onClick={() => { setPwId(u.id); setNewPw(""); }} className="text-xs text-muted hover:underline mr-2">Passwort</button>
                {u.isActive && <button onClick={() => deactivate(u.id)} className="text-xs text-danger hover:underline">Deaktivieren</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
        {users.length === 0 && <div className="p-8 text-center text-muted text-sm">Keine Benutzer vorhanden.</div>}
      </div>

      {showNew && <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"><div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-bold mb-4">Neuer Benutzer</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted block mb-1">Vorname</label><input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" /></div>
            <div><label className="text-xs text-muted block mb-1">Nachname</label><input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" /></div>
          </div>
          <div><label className="text-xs text-muted block mb-1">E-Mail</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" /></div>
          <div><label className="text-xs text-muted block mb-1">Passwort</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" /></div>
          <div><label className="text-xs text-muted block mb-1">Rollen</label><div className="flex flex-wrap gap-2">{roles.map(r => <label key={r} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={form.roles.includes(r)} onChange={() => setForm({...form, roles: toggleRole(r, form.roles)})} className="accent-primary" />{r}</label>)}</div></div>
          <div className="flex gap-2 pt-2"><button onClick={create} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">Anlegen</button><button onClick={() => setShowNew(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Abbrechen</button></div>
        </div>
      </div></div>}

      {editId && <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"><div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-bold mb-4">Benutzer bearbeiten</h2>
        <div className="space-y-3">
          {editUser && (
            <div><label className="text-xs text-muted block mb-1">Profilbild</label>
              <AvatarEditor
                name={`${editUser.firstName} ${editUser.lastName}`}
                avatarUrl={editUser.avatarUrl}
                sizeClass="w-12 h-12 text-sm"
                onUpload={(file) => api.uploadUserAvatar(editUser.id, file)}
                onRemove={() => api.removeUserAvatar(editUser.id)}
                onChanged={handleAvatarChanged}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted block mb-1">Vorname</label><input value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" /></div>
            <div><label className="text-xs text-muted block mb-1">Nachname</label><input value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" /></div>
          </div>
          <div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm({...editForm, isActive: e.target.checked})} className="accent-primary" />Aktiv</label></div>
          <div><label className="text-xs text-muted block mb-1">Rollen</label><div className="flex flex-wrap gap-2">{roles.map(r => <label key={r} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={editForm.roles.includes(r)} onChange={() => setEditForm({...editForm, roles: toggleRole(r, editForm.roles)})} className="accent-primary" />{r}</label>)}</div></div>
          <div className="flex gap-2 pt-2"><button onClick={saveEdit} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">Speichern</button><button onClick={() => setEditId(null)} className="px-4 py-2 border border-border rounded-lg text-sm">Abbrechen</button></div>
        </div>
      </div></div>}

      {pwId && <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"><div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-bold mb-4">Passwort zuruecksetzen</h2>
        <div><label className="text-xs text-muted block mb-1">Neues Passwort</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" /></div>
        <div className="flex gap-2 mt-4"><button onClick={resetPw} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">Zuruecksetzen</button><button onClick={() => setPwId(null)} className="px-4 py-2 border border-border rounded-lg text-sm">Abbrechen</button></div>
      </div></div>}
    </div>
  );
}
