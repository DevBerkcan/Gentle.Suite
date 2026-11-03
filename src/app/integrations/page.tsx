"use client";
import { useEffect, useState } from "react";
import { Copy, KeyRound, Plus } from "lucide-react";
import { api } from "@/lib/api";

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/integrations/hub/v1`;
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "–");

export default function IntegrationsPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [name, setName] = useState("GentleHub");
  const [created, setCreated] = useState<{ name: string; plainKey: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = () => api.integrationKeys().then(setKeys).catch((e) => setError(e?.message || "Konnte nicht geladen werden"));
  useEffect(() => { load(); }, []);

  async function create() {
    setError("");
    try {
      const r = await api.createIntegrationKey(name.trim());
      setCreated({ name: r.key.name, plainKey: r.plainKey });
      load();
    } catch (e: any) { setError(e?.message || "Schlüssel konnte nicht erzeugt werden"); }
  }
  async function revoke(k: any) {
    if (!confirm(`Schlüssel „${k.name}“ (${k.prefix}…) widerrufen? Systeme, die ihn nutzen, können danach nichts mehr anlegen.`)) return;
    try { await api.revokeIntegrationKey(k.id); load(); } catch (e: any) { setError(e?.message || "Widerrufen fehlgeschlagen"); }
  }
  async function copy(text: string, what: string) { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 2000); }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold">Schnittstellen</h1>
      <p className="text-sm text-muted mt-0.5 mb-6">API-Schlüssel für vertrauenswürdige Systeme wie GentleHub. Damit können Kunden und Kontakte automatisch angelegt werden – ohne Login und ohne Willkommens-Mail.</p>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}

      {created && (
        <div className="mb-6 rounded-xl border-2 border-success bg-green-50 p-4">
          <p className="font-semibold text-success">Schlüssel „{created.name}“ erzeugt</p>
          <p className="text-sm mt-1">Kopiere ihn jetzt und trage ihn in GentleHub ein. <strong>Er wird nur dieses eine Mal angezeigt</strong> – Gentlesuite speichert ihn nur verschlüsselt.</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 text-sm border border-border">{created.plainKey}</code>
            <button onClick={() => copy(created.plainKey, "key")} className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm bg-white"><Copy size={14} />{copied === "key" ? "Kopiert" : "Kopieren"}</button>
          </div>
          <button onClick={() => setCreated(null)} className="mt-3 text-sm text-muted underline">Ich habe den Schlüssel gesichert</button>
        </div>
      )}

      <section className="bg-surface border border-border rounded-xl p-5 mb-6">
        <h2 className="font-semibold mb-3">Neuen Schlüssel erzeugen</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block"><span className="block text-xs text-muted mb-1">Name (z. B. System, für das der Schlüssel gilt)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm min-w-64" />
          </label>
          <button onClick={create} disabled={!name.trim()} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"><Plus size={14} /> Erzeugen</button>
        </div>
      </section>

      <section className="bg-surface border border-border rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-xs text-muted"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Schlüssel</th><th className="px-4 py-2">Erzeugt</th><th className="px-4 py-2">Zuletzt genutzt</th><th className="px-4 py-2" /></tr></thead>
          <tbody className="divide-y divide-border">
            {keys.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-muted">Noch keine Schlüssel.</td></tr>}
            {keys.map((k) => (
              <tr key={k.id} className={k.revokedAt ? "opacity-50" : ""}>
                <td className="px-4 py-2 font-medium"><KeyRound size={14} className="inline mr-1.5 text-muted" />{k.name}</td>
                <td className="px-4 py-2 font-mono text-xs">{k.prefix}…</td>
                <td className="px-4 py-2">{fmt(k.createdAt)}</td>
                <td className="px-4 py-2">{fmt(k.lastUsedAt)}</td>
                <td className="px-4 py-2 text-right">{k.revokedAt ? <span className="text-xs text-muted">widerrufen {fmt(k.revokedAt)}</span> : <button onClick={() => revoke(k)} className="text-danger text-xs hover:underline">Widerrufen</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 text-sm space-y-2">
        <h2 className="font-semibold">Für GentleHub</h2>
        <div className="flex items-center gap-2"><span className="text-muted">Basis-URL:</span><code className="text-xs">{API_BASE}</code><button onClick={() => copy(API_BASE, "url")} className="text-xs text-primary">{copied === "url" ? "kopiert" : "kopieren"}</button></div>
        <p className="text-muted">Header <code>X-Api-Key: gsk_…</code>. Endpunkte: <code>GET /ping</code>, <code>GET /customers/lookup?email=…</code>, <code>POST /customers</code>, <code>POST /customers/{"{id}"}/contacts</code>. Bereits bekannte Personen werden nicht doppelt angelegt.</p>
      </section>
    </div>
  );
}
