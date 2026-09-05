"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const STATUS_TABS = [
  { key: "", label: "Alle" },
  { key: "Active", label: "Aktiv" },
  { key: "Lead", label: "Lead" },
  { key: "Inactive", label: "Inaktiv" },
];

const STATUS_COLOR: Record<string, string> = {
  Active: "bg-green-50 text-success",
  Lead: "bg-blue-50 text-blue-700",
  Inactive: "bg-gray-100 text-muted",
  Churned: "bg-red-50 text-danger",
};
const STATUS_LABEL: Record<string, string> = {
  Active: "Aktiv",
  Lead: "Lead",
  Inactive: "Inaktiv",
  Churned: "Churned",
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const defaultForm = { companyName: "", industry: "", website: "", taxId: "", vatId: "", dataSource: "", dataSourceNote: "", primaryContact: { firstName: "", lastName: "", email: "", phone: "", position: "" }, primaryLocation: { label: "Hauptsitz", street: "", city: "", zipCode: "", country: "Deutschland" } };

const DATA_SOURCE_OPTIONS = [
  { value: "Inbound", label: "Kunde hat angefragt (Inbound)" },
  { value: "Referral", label: "Empfehlung" },
  { value: "Campaign", label: "Kampagne/Werbung" },
  { value: "Direct", label: "Direkt/persönlich bekannt" },
  { value: "Other", label: "Sonstige (z.B. öffentliche Website recherchiert)" },
];

export default function CustomersPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showNew, setShowNew] = useState(false);
  const [form, setForm, clearForm] = useLocalStorage("draft:customer-create", defaultForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showQuick, setShowQuick] = useState(false);
  const [quickForm, setQuickForm] = useState({ email: "", companyName: "" });
  const [quickLoading, setQuickLoading] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<any>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    api.customers(params.toString()).then(setData).catch(() => setError("Kunden konnten nicht geladen werden"));
  };

  useEffect(() => { setPage(1); }, [search, statusFilter, pageSize]);
  useEffect(() => { load(); }, [search, statusFilter, page, pageSize]);

  const items: any[] = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, totalCount);

  const sorted = [...items].sort((a, b) => {
    const cmp = (a.companyName || "").localeCompare(b.companyName || "");
    return sortAsc ? cmp : -cmp;
  });

  const allSelected = sorted.length > 0 && sorted.every(c => selected.has(c.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(sorted.map(c => c.id)));
  };
  const toggleOne = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const dup = await api.checkCustomerDuplicate({ companyName: form.companyName, email: form.primaryContact.email || null, phone: form.primaryContact.phone || null });
      if (dup?.hasDuplicate) { setDuplicateMatches(dup.matches || []); setError("Moegliche Dublette erkannt. Bitte vorhandenen Kunden pruefen."); return; }
      await api.createCustomer(form);
      setShowNew(false); clearForm(); setDuplicateMatches([]); setError("");
      setSuccess("Kunde erfolgreich angelegt"); setTimeout(() => setSuccess(""), 4000);
      load();
    } catch (e: any) { setError(e?.message || "Fehler beim Anlegen"); }
  }

  async function handleQuickCreate(e: React.FormEvent) {
    e.preventDefault();
    setQuickLoading(true);
    try {
      await api.createCustomerQuick({ email: quickForm.email, companyName: quickForm.companyName || undefined });
      setShowQuick(false);
      setQuickForm({ email: "", companyName: "" });
      setError("");
      setSuccess("Einladungs-E-Mail wurde gesendet! Der Kunde kann seine Daten jetzt selbst vervollständigen.");
      setTimeout(() => setSuccess(""), 6000);
      load();
    } catch (e: any) { setError(e?.message || "Fehler bei der Schnellerfassung"); }
    finally { setQuickLoading(false); }
  }

  async function handleDelete(id: string, name: string) {
    setMenuOpen(null);
    if (!confirm(`Kunden „${name}" wirklich löschen?`)) return;
    try { await api.deleteCustomer(id); load(); } catch (e: any) { setError(e?.message || "Fehler beim Löschen"); }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-bold">Kunden</h1>
        <div className="flex items-center gap-3">
          <input placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} className="px-3 py-1.5 border border-border rounded-lg text-sm w-52" />
          <button onClick={() => setShowQuick(true)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background transition-colors">✉ Schnellerfassung</button>
          <a href={api.exportCustomersCsv(statusFilter || undefined)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background transition-colors">↓ CSV-Export</a>
          <button onClick={() => { setShowCsvImport(true); setCsvFile(null); setCsvResult(null); }} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background transition-colors">↑ CSV-Import</button>
          <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">+ Neuer Kunde</button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">×</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setStatusFilter(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${statusFilter === t.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-text"}`}>{t.label}</button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              </th>
              <th className="px-3 py-3 text-left text-xs text-muted w-20">Nr.</th>
              <th className="px-3 py-3 text-left text-xs text-muted cursor-pointer select-none" onClick={() => setSortAsc(a => !a)}>
                Name {sortAsc ? "↑" : "↓"}
              </th>
              <th className="px-3 py-3 text-left text-xs text-muted hidden lg:table-cell">Straße</th>
              <th className="px-3 py-3 text-left text-xs text-muted hidden lg:table-cell">Ort</th>
              <th className="px-3 py-3 text-right text-xs text-muted hidden xl:table-cell">Umsatz</th>
              <th className="px-3 py-3 text-left text-xs text-muted">Status</th>
              <th className="px-3 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c: any) => (
              <tr key={c.id} className={`border-b border-border hover:bg-background/60 ${selected.has(c.id) ? "bg-blue-50/30" : ""}`}>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} className="rounded" />
                </td>
                <td className="px-3 py-3 text-xs text-muted cursor-pointer" onClick={() => router.push(`/customers/${c.id}`)}>{c.customerNumber || "–"}</td>
                <td className="px-3 py-3 cursor-pointer" onClick={() => router.push(`/customers/${c.id}`)}>
                  <div className="font-medium text-sm">{c.companyName}</div>
                  {c.primaryContactName && <div className="text-xs text-muted">{c.primaryContactName}</div>}
                </td>
                <td className="px-3 py-3 text-sm text-muted hidden lg:table-cell cursor-pointer" onClick={() => router.push(`/customers/${c.id}`)}>{c.street || "–"}</td>
                <td className="px-3 py-3 text-sm text-muted hidden lg:table-cell cursor-pointer" onClick={() => router.push(`/customers/${c.id}`)}>{c.city || "–"}</td>
                <td className="px-3 py-3 text-right text-sm font-medium hidden xl:table-cell cursor-pointer" onClick={() => router.push(`/customers/${c.id}`)}>{c.totalRevenue > 0 ? `${Number(c.totalRevenue).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €` : "–"}</td>
                <td className="px-3 py-3 cursor-pointer" onClick={() => router.push(`/customers/${c.id}`)}>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[c.status] || "bg-gray-100 text-muted"}`}>{STATUS_LABEL[c.status] || c.status}</span>
                </td>
                <td className="px-3 py-3 relative" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setMenuOpen(menuOpen === c.id ? null : c.id)} className="p-1 rounded hover:bg-background text-muted hover:text-text">⋮</button>
                  {menuOpen === c.id && (
                    <div className="absolute right-8 top-2 z-10 bg-surface border border-border rounded-lg shadow-lg w-36 py-1">
                      <button onClick={() => { setMenuOpen(null); router.push(`/customers/${c.id}`); }} className="w-full text-left px-4 py-2 text-sm hover:bg-background">Öffnen</button>
                      <button onClick={() => handleDelete(c.id, c.companyName)} className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-red-50">Löschen</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <div className="p-8 text-center text-muted text-sm">{search ? "Keine Kunden gefunden." : "Noch keine Kunden vorhanden."}</div>}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>{startIdx}–{endIdx} von {totalCount}</span>
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="ml-3 px-2 py-1 border border-border rounded text-sm">
              {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s} pro Seite</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-border rounded text-sm disabled:opacity-40 hover:bg-background">←</button>
            <span className="text-sm text-muted">Seite {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 border border-border rounded text-sm disabled:opacity-40 hover:bg-background">→</button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNew(false)}>
          <div className="bg-surface rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Neuer Kunde</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Firma *</label><input required value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Branche</label><input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
              </div>
              <h3 className="font-semibold">Datenherkunft</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Woher stammen die Daten? *</label>
                  <select required value={form.dataSource} onChange={e => setForm({ ...form, dataSource: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg">
                    <option value="">Bitte wählen...</option>
                    {DATA_SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">Notiz zur Herkunft</label><input placeholder="z.B. Firmenwebsite, Messe XY..." value={form.dataSourceNote} onChange={e => setForm({ ...form, dataSourceNote: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
              </div>
              <h3 className="font-semibold">Ansprechpartner</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><input required placeholder="Vorname *" value={form.primaryContact.firstName} onChange={e => setForm({ ...form, primaryContact: { ...form.primaryContact, firstName: e.target.value } })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
                <div><input required placeholder="Nachname *" value={form.primaryContact.lastName} onChange={e => setForm({ ...form, primaryContact: { ...form.primaryContact, lastName: e.target.value } })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
                <div><input required type="email" placeholder="E-Mail *" value={form.primaryContact.email} onChange={e => setForm({ ...form, primaryContact: { ...form.primaryContact, email: e.target.value } })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
                <div><input placeholder="Telefon" value={form.primaryContact.phone} onChange={e => setForm({ ...form, primaryContact: { ...form.primaryContact, phone: e.target.value } })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
              </div>
              <h3 className="font-semibold">Adresse</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><input placeholder="Strasse" value={form.primaryLocation.street} onChange={e => setForm({ ...form, primaryLocation: { ...form.primaryLocation, street: e.target.value } })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
                <div><input placeholder="PLZ" value={form.primaryLocation.zipCode} onChange={e => setForm({ ...form, primaryLocation: { ...form.primaryLocation, zipCode: e.target.value } })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
                <div><input placeholder="Stadt" value={form.primaryLocation.city} onChange={e => setForm({ ...form, primaryLocation: { ...form.primaryLocation, city: e.target.value } })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Anlegen</button>
                <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Abbrechen</button>
              </div>
              {duplicateMatches.length > 0 && (
                <div className="text-xs text-danger bg-red-50 border border-red-100 rounded-lg p-3">
                  {duplicateMatches.map((m: any, idx: number) => (
                    <div key={`${m.customerId}-${idx}`}>{m.companyName} · {m.matchType}{m.email ? ` · ${m.email}` : ""}{m.phone ? ` · ${m.phone}` : ""}</div>
                  ))}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Close menu on outside click */}
      {menuOpen && <div className="fixed inset-0 z-[5]" onClick={() => setMenuOpen(null)} />}

      {/* Schnellerfassung Modal */}
      {showQuick && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleQuickCreate} className="bg-surface rounded-xl border border-border p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-1">Schnellerfassung</h2>
            <p className="text-sm text-muted mb-4">Der Kunde erhält eine E-Mail mit einem Link und kann seine Daten selbst eintragen.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text mb-1">E-Mail-Adresse *</label>
                <input required type="email" value={quickForm.email} onChange={e => setQuickForm({ ...quickForm, email: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="kunde@beispiel.de" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Firmenname (optional)</label>
                <input value={quickForm.companyName} onChange={e => setQuickForm({ ...quickForm, companyName: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Wird vom Kunden ausgefüllt wenn leer" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => { setShowQuick(false); setQuickForm({ email: "", companyName: "" }); }} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background transition-colors">Abbrechen</button>
              <button type="submit" disabled={quickLoading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {quickLoading ? "Sende..." : "E-Mail senden"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CSV-Import Modal */}
      {showCsvImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCsvImport(false)}>
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg shadow-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-1">CSV-Import</h2>
            <p className="text-sm text-muted mb-4">Importiere Kunden und Kontakte aus einer CSV-Datei (Semikolon-getrennt).</p>

            {!csvResult ? (
              <>
                <div className="bg-background border border-border rounded-lg p-3 mb-4 text-xs text-muted font-mono">
                  Firma;Vorname;Nachname;Email;Telefon;Position;Strasse;Ort;PLZ;Land;Branche;Website
                </div>
                <label className="block w-full cursor-pointer">
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${csvFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                    {csvFile ? (
                      <div>
                        <p className="font-medium text-sm">{csvFile.name}</p>
                        <p className="text-xs text-muted mt-1">{(csvFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium">CSV-Datei auswählen</p>
                        <p className="text-xs text-muted mt-1">.csv, Semikolon-getrennt, UTF-8</p>
                      </div>
                    )}
                  </div>
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => setCsvFile(e.target.files?.[0] ?? null)} />
                </label>
                <div className="flex justify-end gap-3 mt-5">
                  <button type="button" onClick={() => setShowCsvImport(false)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">Abbrechen</button>
                  <button
                    type="button"
                    disabled={!csvFile || csvLoading}
                    onClick={async () => {
                      if (!csvFile) return;
                      setCsvLoading(true);
                      try {
                        const result = await api.importCustomersCsv(csvFile);
                        setCsvResult(result);
                        load();
                      } catch (e: any) { setError(e.message); setShowCsvImport(false); }
                      finally { setCsvLoading(false); }
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {csvLoading ? "Importiere..." : "Importieren"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-success">{csvResult.imported}</p>
                      <p className="text-xs text-muted">Importiert</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-warning">{csvResult.skipped}</p>
                      <p className="text-xs text-muted">Übersprungen</p>
                    </div>
                    <div className="bg-gray-50 border border-border rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">{csvResult.imported + csvResult.skipped}</p>
                      <p className="text-xs text-muted">Gesamt</p>
                    </div>
                  </div>
                  {csvResult.errors?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <p className="text-xs font-semibold text-danger mb-2">Fehler:</p>
                      {csvResult.errors.map((e: string, i: number) => (
                        <p key={i} className="text-xs text-danger">{e}</p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-5">
                  <button onClick={() => setShowCsvImport(false)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">Fertig</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
