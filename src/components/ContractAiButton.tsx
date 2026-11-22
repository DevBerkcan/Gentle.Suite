"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";

/** sessionStorage key the contract wizard reads its AI proposal from (one-shot, removed after reading). */
export const CONTRACT_AI_DRAFT_KEY = "gs.contractAiDraft";

const EXAMPLES = [
  "Wartungsvertrag WordPress, 49 € im Monat, 12 Monate Laufzeit, 3 Monate Kündigung",
  "Webdesign-Vertrag zum Angebot, inkl. Logo, Zahlung 14 Tage",
  "Softwarevertrag für das Kundenportal mit API-Anbindung, Abnahme nach Pilot",
];

/** "Vertrag mit KI" on the customer page: one sentence in, filled contract wizard out. Hidden while no AI key is configured. */
export function ContractAiButton({ customerId, customerName }: { customerId: string; customerName: string }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { api.contractAiStatus().then(s => setEnabled(s.enabled)).catch(() => setEnabled(false)); }, []);
  if (!enabled) return null;

  async function run() {
    setBusy(true); setError("");
    try {
      const draft = await api.contractAiDraft({ customerId, beschreibung: text });
      try { sessionStorage.setItem(CONTRACT_AI_DRAFT_KEY, JSON.stringify({ ...draft, wish: text, createdAt: Date.now() })); } catch { /* storage blocked: wizard opens empty */ }
      const q = draft.quoteId ? `quoteId=${draft.quoteId}` : `subscriptionId=${draft.subscriptionId}`;
      router.push(`/contracts/new?${q}&ai=1`);
    } catch (e: any) {
      const msg = String(e?.message || "");
      setError(/429/.test(msg) ? "Zu viele Anfragen in kurzer Zeit – bitte eine Minute warten und erneut versuchen."
        : msg || "Der Vertrags-Agent konnte keinen Vorschlag erstellen.");
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={() => { setOpen(true); setError(""); }} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-accent" />Vertrag mit KI
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <div className="bg-surface rounded-2xl border border-border w-full max-w-xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="w-5 h-5 text-secondary" />Vertrag mit KI erstellen</h2>
              <button onClick={() => !busy && setOpen(false)} className="text-muted hover:text-text" aria-label="Schließen"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted mb-4">
              Beschreibe in einem Satz, welchen Vertrag {customerName} bekommt. Der Agent sucht das passende Angebot bzw. die Serienrechnung,
              wählt Vorlage, Leistungen und Klauseln und schreibt eine Leistungsbeschreibung. Du prüfst alles im Vertrags-Assistenten – angelegt wird nur ein Entwurf.
            </p>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3} autoFocus maxLength={2000}
              placeholder="z. B. Wartungsvertrag WordPress, 49 € im Monat, 12 Monate"
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && text.trim().length >= 5 && !busy) run(); }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface" />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {EXAMPLES.map(ex => (
                <button key={ex} type="button" onClick={() => setText(ex)} className="text-xs px-2.5 py-1 rounded-full bg-background border border-border text-muted hover:text-text">{ex}</button>
              ))}
            </div>
            {error && <div className="mt-3 bg-red-50 text-danger px-3 py-2 rounded-lg text-sm">{error}</div>}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setOpen(false)} disabled={busy} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background disabled:opacity-50">Abbrechen</button>
              <button onClick={run} disabled={busy || text.trim().length < 5} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
                {busy ? "Agent arbeitet…" : "Vorschlag erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
