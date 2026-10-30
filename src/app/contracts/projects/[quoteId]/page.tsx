"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Circle, ExternalLink, Minus, Send } from "lucide-react";
import { api } from "@/lib/api";

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }) : "");
const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

const STEP_BADGE: Record<string, { label: string; cls: string }> = {
  done: { label: "Erledigt", cls: "bg-green-50 text-success" },
  "not-required": { label: "Nicht erforderlich", cls: "bg-gray-100 text-gray-600" },
  "in-progress": { label: "In Arbeit", cls: "bg-orange-50 text-orange-700" },
  open: { label: "Offen", cls: "bg-blue-50 text-blue-700" },
  problem: { label: "Problem", cls: "bg-red-50 text-danger" },
};

function StateIcon({ state }: { state: string }) {
  if (state === "done") return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-white"><Check className="h-4 w-4" strokeWidth={3} /></span>;
  if (state === "not-required") return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500"><Minus className="h-4 w-4" /></span>;
  if (state === "problem") return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-danger text-white"><AlertTriangle className="h-3.5 w-3.5" /></span>;
  return <Circle className="h-6 w-6 shrink-0 text-border" />;
}

function ManualItem({ sub, onSave }: { sub: any; onSave: (state: string, note: string | null) => Promise<void> }) {
  const [note, setNote] = useState(sub.note || "");
  useEffect(() => setNote(sub.note || ""), [sub.note]);
  const opts: [string, string][] = [["open", "Offen"], ["done", "Erledigt"], ["not-required", "Nicht nötig"]];
  return (
    <div className="flex-1 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{sub.title}{sub.optional && <span className="ml-1 text-xs font-normal text-muted">(optional)</span>}</span>
        <div className="flex rounded-lg border border-border p-0.5 text-xs">
          {opts.map(([k, l]) => (
            <button key={k} onClick={() => onSave(k, note || null)} className={`rounded-md px-2.5 py-1 ${sub.state === k ? (k === "done" ? "bg-success text-white" : k === "not-required" ? "bg-gray-500 text-white" : "bg-primary text-white") : "text-muted hover:text-text"}`}>{l}</button>
          ))}
        </div>
      </div>
      {sub.hint && <p className="text-xs text-muted">{sub.hint}</p>}
      <input value={note} onChange={e => setNote(e.target.value)} onBlur={() => { if ((sub.note || "") !== note) onSave(sub.state, note || null); }}
        placeholder="Notiz (z. B. Link, wo erledigt, warum nicht nötig)" className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm" />
    </div>
  );
}

export default function LegalWorkflowDetailPage() {
  const { quoteId } = useParams() as { quoteId: string };
  const [wf, setWf] = useState<any>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState("");
  const [rightsTo, setRightsTo] = useState("");
  const [accTo, setAccTo] = useState("");
  const [accScope, setAccScope] = useState("");
  const [accDays, setAccDays] = useState(14);

  function apply(d: any, initial = false) {
    setWf(d);
    if (initial) {
      setRightsTo(d.rightsRequestedTo || d.contactEmail || "");
      setAccTo(d.acceptanceRequestedTo || d.contactEmail || "");
      setAccScope(d.acceptanceScope || "");
      // Open the first unfinished step.
      const first = d.steps.find((s: any) => s.state !== "done" && s.state !== "not-required");
      if (first) setOpen({ [first.key]: true });
    }
  }

  useEffect(() => { api.legalWorkflow(quoteId).then(d => apply(d, true)).catch(e => setError(e?.message || "Konnte nicht geladen werden")); }, [quoteId]);

  // Saves run strictly one after another: typing a note and then clicking "Erledigt" fires blur + click
  // back to back, and the click must win.
  const queue = useRef<Promise<void>>(Promise.resolve());
  function run(key: string, fn: () => Promise<any>, success?: string) {
    queue.current = queue.current.then(async () => {
      setBusy(key); setError(""); setInfo("");
      try { apply(await fn()); if (success) setInfo(success); } catch (e: any) { setError(e?.message || "Aktion fehlgeschlagen"); } finally { setBusy(""); }
    });
    return queue.current;
  }

  if (!wf) return <div className="p-8 text-sm text-muted">{error || "Lädt …"}</div>;

  const pct = Math.round((wf.doneSteps / wf.totalSteps) * 100);

  // Plain render function (not a component) so the inputs keep focus across re-renders.
  function renderActions(step: any) {
    if (step.key === "offer") return (
      <Link href={`/quotes/${wf.quoteId}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">Zum Angebot {wf.quoteNumber}<ExternalLink className="h-3.5 w-3.5" /></Link>
    );
    if (step.key === "contract") return wf.agencyContractId
      ? <Link href={`/contracts/${wf.agencyContractId}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">Vertrag {wf.agencyContractNumber} öffnen<ExternalLink className="h-3.5 w-3.5" /></Link>
      : <Link href={`/contracts/new?quoteId=${wf.quoteId}`} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-hover">Agenturvertrag aus Angebot erstellen</Link>;
    if (step.key === "rights") return wf.rightsGrantedAt ? (
      <p className="text-sm text-muted">Bestätigt am {fmt(wf.rightsGrantedAt)} von {wf.rightsGrantedByName} · Referenz-Nutzung: {wf.rightsReferenceConsent ? "erlaubt" : "nicht erlaubt"}</p>
    ) : (
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">Empfänger<input type="email" value={rightsTo} onChange={e => setRightsTo(e.target.value)} className="mt-0.5 block w-72 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text" /></label>
        <button disabled={!!busy || !rightsTo} onClick={() => run("rights", () => api.sendLegalRightsRequest(wf.quoteId, { recipientEmail: rightsTo }), `Freigabe-Anfrage an ${rightsTo} gesendet.`)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-hover disabled:opacity-50">
          <Send className="h-3.5 w-3.5" />{wf.rightsRequestedAt ? "Erneut senden" : "Freigabe anfordern"}
        </button>
      </div>
    );
    if (step.key === "acceptance") {
      const decided = wf.acceptanceResult === "accepted" || wf.acceptanceResult === "accepted-with-reservations";
      if (decided) return <p className="text-sm text-muted">Erklärt am {fmt(wf.acceptanceRespondedAt)} von {wf.acceptanceByName}{wf.acceptanceRemarks ? ` · Vorbehalte: ${wf.acceptanceRemarks}` : ""}</p>;
      return (
        <div className="space-y-2">
          {wf.acceptanceResult === "declined" && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">Verweigert am {fmt(wf.acceptanceRespondedAt)} von {wf.acceptanceByName}: {wf.acceptanceRemarks}. Nach Behebung erneut anfordern.</p>}
          {wf.acceptanceDeemed && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">Frist am {fmt(wf.acceptanceDeadline)} ohne Rückmeldung abgelaufen — die Leistung gilt laut Vertrag als abgenommen.</p>}
          {!wf.acceptanceDeemed && (
            <>
              <label className="block text-xs text-muted">Umfang der Abnahme
                <textarea value={accScope} onChange={e => setAccScope(e.target.value)} rows={2} placeholder={`Alle Leistungen aus dem Angebot ${wf.quoteNumber}`} className="mt-0.5 block w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text" />
              </label>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-muted">Empfänger<input type="email" value={accTo} onChange={e => setAccTo(e.target.value)} className="mt-0.5 block w-72 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text" /></label>
                <label className="text-xs text-muted">Frist
                  <select value={accDays} onChange={e => setAccDays(Number(e.target.value))} className="mt-0.5 block rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text">
                    {[7, 14, 21, 30].map(d => <option key={d} value={d}>{d} Tage</option>)}
                  </select>
                </label>
                <button disabled={!!busy || !accTo} onClick={() => run("acceptance", () => api.sendLegalAcceptanceRequest(wf.quoteId, { recipientEmail: accTo, scope: accScope || undefined, deadlineDays: accDays }), `Abnahme bei ${accTo} angefordert.`)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-hover disabled:opacity-50">
                  <Send className="h-3.5 w-3.5" />{wf.acceptanceRequestedAt ? "Erneut anfordern" : "Abnahme anfordern"}
                </button>
              </div>
              <p className="text-xs text-muted">Laut Vertrag gilt die Leistung als abgenommen, wenn innerhalb von zwei Wochen keine Rückmeldung kommt — deshalb mindestens 14 Tage Frist.</p>
            </>
          )}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="max-w-4xl p-8">
      <Link href="/contracts/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"><ArrowLeft className="h-4 w-4" />Projekt-Ablauf</Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{wf.customerName}</h1>
          <p className="mt-0.5 text-sm text-muted">{wf.quoteNumber}{wf.subject ? ` · ${wf.subject}` : ""} · {eur(wf.quoteTotal)}</p>
        </div>
        <div className="w-64">
          <div className="mb-1 flex justify-between text-xs text-muted"><span>Fortschritt</span><span>{wf.doneSteps} von {wf.totalSteps} Schritten</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-danger">{error}</div>}
      {info && <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-success">{info}</div>}

      <ol className="space-y-3">
        {wf.steps.map((step: any) => {
          const isOpen = !!open[step.key];
          const badge = STEP_BADGE[step.state] || STEP_BADGE.open;
          return (
            <li key={step.key} className="overflow-hidden rounded-xl border border-border bg-surface">
              <button onClick={() => setOpen(o => ({ ...o, [step.key]: !isOpen }))} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-background" aria-expanded={isOpen}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.state === "done" || step.state === "not-required" ? "bg-success text-white" : "bg-navy text-white"}`}>
                  {step.state === "done" || step.state === "not-required" ? <Check className="h-4 w-4" strokeWidth={3} /> : step.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{step.title}</span>
                  <span className="block truncate text-xs text-muted">{step.description}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${badge.cls}`}>{badge.label}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-border px-4 py-4">
                  {step.subSteps.map((sub: any) => (
                    <div key={sub.key} className="flex items-start gap-3">
                      <StateIcon state={sub.state} />
                      {sub.manual
                        ? <ManualItem sub={sub} onSave={(state, note) => run(sub.key, () => api.updateLegalWorkflowItem(wf.quoteId, { key: sub.key, state, note }))} />
                        : (
                          <div className="flex-1">
                            <span className="text-sm font-medium">{sub.title}</span>
                            {(sub.note || sub.at) && <span className={`block text-xs ${sub.state === "problem" ? "text-danger" : "text-muted"}`}>{[sub.note, sub.state === "done" && sub.at ? fmt(sub.at) : null].filter(Boolean).join(" · ")}</span>}
                          </div>
                        )}
                    </div>
                  ))}
                  <div className="border-t border-dashed border-border pt-3">{renderActions(step)}</div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
