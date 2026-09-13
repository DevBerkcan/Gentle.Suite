"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

type Section = { title: string; content: string };

const statusMap: Record<string, { label: string; cls: string }> = {
  Draft: { label: "Entwurf", cls: "bg-gray-100 text-gray-700" },
  SentForSignature: { label: "Wartet auf Unterschrift", cls: "bg-orange-50 text-orange-700" },
  FullyExecuted: { label: "Abgeschlossen", cls: "bg-green-50 text-success" },
  Declined: { label: "Abgelehnt", cls: "bg-red-50 text-danger" },
};

export default function AgencyContractDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [contract, setContract] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  function load() {
    api.agencyContract(id).then(c => { setContract(c); setSections(c.sections || []); }).catch(() => setError("Vertrag konnte nicht geladen werden"));
  }

  useEffect(() => { load(); }, [id]);

  function updateSection(i: number, field: "title" | "content", value: string) {
    const next = [...sections];
    next[i] = { ...next[i], [field]: value };
    setSections(next);
  }

  function addSection() { setSections([...sections, { title: "", content: "" }]); }
  function removeSection(i: number) { setSections(sections.filter((_, idx) => idx !== i)); }

  async function saveSections() {
    setSaving(true);
    setError("");
    try {
      const updated = await api.updateAgencyContractSections(id, sections.filter(s => s.title.trim()));
      setContract(updated);
      setSections(updated.sections || []);
      setSuccess("Gespeichert");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e?.message || "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  async function signAndSend() {
    if (!confirm("Vertrag intern unterschreiben und an den Kunden zur Unterschrift senden?")) return;
    setSending(true);
    setError("");
    try {
      const updated = await api.signAndSendAgencyContract(id);
      setContract(updated);
      setSuccess("Vertrag wurde intern bestätigt und an den Kunden gesendet.");
      setTimeout(() => setSuccess(""), 6000);
    } catch (e: any) {
      setError(e?.message || "Fehler beim Senden");
    } finally {
      setSending(false);
    }
  }

  async function downloadPdf() {
    try {
      const blob = await api.agencyContractPdfBlob(id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setError("PDF konnte nicht geladen werden");
    }
  }

  if (!contract) return <div className="p-8 text-muted">{error || "Lädt..."}</div>;

  const s = statusMap[contract.status] || { label: contract.status, cls: "bg-gray-100 text-gray-700" };
  const isDraft = contract.status === "Draft";

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{contract.contractTypeName}</h1>
          <p className="text-sm text-muted mt-0.5">{contract.contractNumber} · {contract.customerName}{contract.quoteNumber ? ` · ${contract.quoteNumber}` : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded-full ${s.cls}`}>{s.label}</span>
          <button onClick={downloadPdf} className="px-3 py-1.5 border border-border rounded-lg text-sm font-medium hover:bg-background">PDF</button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">×</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      {contract.totalContractValue != null && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-4 text-sm">
          <span className="text-muted">Vertragswert: </span>
          <span className="font-semibold">{Number(contract.totalContractValue).toFixed(2)} €</span>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Abschnitte</h2>
          {isDraft && <button onClick={addSection} className="text-xs text-primary hover:underline">+ Abschnitt hinzufügen</button>}
        </div>
        <div className="space-y-3">
          {sections.map((sec, i) => (
            <div key={i} className={isDraft ? "border border-border rounded-lg p-3" : ""}>
              {isDraft ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <input value={sec.title} onChange={e => updateSection(i, "title", e.target.value)} className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm font-medium" />
                    <button onClick={() => removeSection(i)} className="text-danger hover:underline text-xs px-2">Entfernen</button>
                  </div>
                  <textarea value={sec.content} onChange={e => updateSection(i, "content", e.target.value)} rows={3} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </>
              ) : (
                <>
                  <h3 className="font-medium text-sm mb-1">{sec.title}</h3>
                  <p className="text-sm text-muted whitespace-pre-wrap">{sec.content}</p>
                </>
              )}
            </div>
          ))}
        </div>
        {isDraft && (
          <div className="flex justify-end mt-4">
            <button onClick={saveSections} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
              {saving ? "Wird gespeichert..." : "Abschnitte speichern"}
            </button>
          </div>
        )}
      </div>

      {isDraft && (
        <div className="bg-surface border border-border rounded-xl p-6 mb-4">
          <h2 className="font-semibold text-sm mb-2">Unterschreiben & senden</h2>
          <p className="text-sm text-muted mb-4">Mit einem Klick bestätigst du den Vertrag auf unserer Seite und der Kunde erhält per E-Mail einen Link zur eigenen Unterschrift.</p>
          <button onClick={signAndSend} disabled={sending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
            {sending ? "Wird gesendet..." : "Ich unterschreibe & sende an den Kunden"}
          </button>
        </div>
      )}

      {contract.status !== "Draft" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-muted mb-1 uppercase tracking-wide">Auftragnehmer</p>
            {contract.repSignedByName ? (
              <>
                <p className="text-sm font-medium text-success">✓ {contract.repSignedByName}</p>
                <p className="text-xs text-muted mt-1">{new Date(contract.repSignedAt).toLocaleString("de-DE")}</p>
              </>
            ) : <p className="text-sm text-muted">Noch nicht bestätigt</p>}
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-muted mb-1 uppercase tracking-wide">Auftraggeber</p>
            {contract.customerSignedByName ? (
              <>
                <p className="text-sm font-medium text-success">✓ {contract.customerSignedByName}</p>
                <p className="text-xs text-muted">{contract.customerSignedByEmail}</p>
                <p className="text-xs text-muted mt-1">{new Date(contract.customerSignedAt).toLocaleString("de-DE")}</p>
              </>
            ) : contract.status === "Declined" ? (
              <p className="text-sm text-danger">Abgelehnt{contract.declineReason ? `: ${contract.declineReason}` : ""}</p>
            ) : <p className="text-sm text-muted">Wartet auf Unterschrift</p>}
          </div>
        </div>
      )}
    </div>
  );
}
