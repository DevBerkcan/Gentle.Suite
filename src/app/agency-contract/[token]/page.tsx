"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import SignaturePad, { SignaturePadHandle } from "@/app/components/SignaturePad";

export default function AgencyContractApprovalPage() {
  const params = useParams();
  const token = params.token as string;
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const padRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    api.agencyContractApproval(token)
      .then(setContract)
      .catch(() => setError("Dieser Link ist ungültig oder abgelaufen."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSign() {
    if (!signerName.trim() || !signerEmail.trim()) { setError("Bitte Name und E-Mail-Adresse angeben."); return; }
    const sigData = padRef.current?.getDataUrl();
    if (!sigData) { setError("Bitte unterschreiben Sie im Feld oben."); return; }
    setSubmitting(true);
    setError("");
    try {
      await api.processAgencyContractApproval(token, { accepted: true, signerName, signerEmail, signatureData: sigData });
      setDone("accepted");
    } catch (e: any) {
      setError(e?.message || "Der Vertrag konnte nicht unterschrieben werden.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    setSubmitting(true);
    setError("");
    try {
      await api.processAgencyContractApproval(token, { accepted: false, declineReason });
      setDone("declined");
    } catch (e: any) {
      setError(e?.message || "Fehler beim Ablehnen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadPdf() {
    try {
      const blob = await api.agencyContractApprovalPdfBlob(token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Vertrag-${contract?.contractNumber || ""}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("PDF konnte nicht geladen werden.");
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Lädt...</div>;

  if (error && !contract) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold mb-2">Link nicht gültig</h1>
        <p className="text-slate-400">{error}</p>
      </div>
    </div>
  );

  if (done === "accepted") return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold mb-2">Vielen Dank!</h1>
        <p className="text-slate-400 mb-6">Der Vertrag wurde erfolgreich unterschrieben und ist damit abgeschlossen.</p>
        <button onClick={downloadPdf} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors">
          Unterschriebenen Vertrag herunterladen
        </button>
      </div>
    </div>
  );

  if (done === "declined") return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold mb-2">Vertrag abgelehnt</h1>
        <p className="text-slate-400">Wir haben Ihre Rückmeldung erhalten und melden uns bei Ihnen.</p>
      </div>
    </div>
  );

  const sections: { title: string; content: string }[] = contract?.sections || [];

  return (
    <div className="min-h-screen bg-slate-900 text-white py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">{contract?.contractTypeName}</h1>
          <p className="text-slate-400 mt-1">{contract?.contractNumber} · {contract?.customerName}</p>
        </div>

        <div className="bg-white text-slate-900 rounded-xl p-6 mb-6 space-y-5">
          {sections.map((s, i) => (
            <div key={i}>
              <h2 className="font-semibold text-sm mb-1">{s.title}</h2>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{s.content}</p>
            </div>
          ))}
          {contract?.totalContractValue != null && (
            <div className="pt-3 border-t border-slate-200 text-sm font-medium">
              Vertragswert: {Number(contract.totalContractValue).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          )}
        </div>

        <button onClick={downloadPdf} className="w-full text-center text-sm text-slate-400 hover:text-white mb-8 underline">
          Als PDF herunterladen
        </button>

        {error && <div className="bg-red-950 text-red-300 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}

        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-4">Jetzt unterschreiben</h2>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Vor- und Nachname</label>
              <input value={signerName} onChange={e => setSignerName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">E-Mail-Adresse</label>
              <input type="email" value={signerEmail} onChange={e => setSignerEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white" />
            </div>
          </div>
          <label className="block text-xs text-slate-400 mb-1">Unterschrift</label>
          <div className="mb-4"><SignaturePad ref={padRef} /></div>
          <button
            onClick={handleSign}
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {submitting ? "Wird gespeichert..." : "Jetzt unterschreiben"}
          </button>
        </div>

        <details className="text-sm text-slate-400" open={showDecline} onToggle={(e) => setShowDecline((e.target as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer hover:text-white">Vertrag ablehnen</summary>
          <div className="mt-3 space-y-3">
            <textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              placeholder="Grund der Ablehnung (optional)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
            />
            <button onClick={handleDecline} disabled={submitting} className="text-red-400 hover:text-red-300 text-sm font-medium">
              Vertrag jetzt ablehnen
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
