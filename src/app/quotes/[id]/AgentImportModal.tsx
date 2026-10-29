"use client";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";

// Prompt + JSON-Schema fuer Claude/ChatGPT. Gleicher Text steht in docs/agent-angebot-import.md – bei Aenderungen beide anpassen.
export const AGENT_PROMPT = `Du erstellst aus dem folgenden Briefing bzw. der Aufwandsschätzung ein Angebot für unser CRM (Gentlesuite).

Antworte AUSSCHLIESSLICH mit einem einzigen JSON-Objekt nach dem Schema unten – kein Markdown, keine Erklärungen, kein Text davor oder danach.

Regeln:
- Alle Preise sind Nettopreise in EUR als Zahl (Punkt als Dezimaltrenner, keine Tausendertrennzeichen, kein Währungssymbol), z. B. 1250.5
- "type": "einmalig" für Projekt-/Einmalleistungen, "monatlich" für laufende monatliche Leistungen (z. B. Hosting, Wartung, Retainer). unitPrice ist bei "monatlich" der Preis pro Monat.
- Pauschalpreise: quantity 1, unit "pauschal".
- Aufwand nach Zeit: quantity = Anzahl (z. B. Stunden), unit = Einheit (z. B. "Stunden"), unitPrice = Preis pro Einheit.
- vatPercent: 19 (Standard), 7 oder 0. Weglassen = 19.
- discountPercent ist optional (0–100), nur angeben, wenn ein Rabatt gewünscht ist.
- title kurz und prägnant (Pflichtfeld), description mit den enthaltenen Leistungen (Zeilenumbrüche mit \\n).
- introText: kurze, freundliche Einleitung an den Kunden. outroText: Abschluss (z. B. nächste Schritte).
- Optionale Leistungen/Alternativen NICHT als Position aufnehmen, sondern als Text im outroText aufführen (inkl. Preis).
- Felder, die du nicht befüllen kannst, weglassen statt erfinden.

Schema (Beispiel):
{
  "subject": "Relaunch Website Muster GmbH",
  "introText": "Sehr geehrte Damen und Herren,\\nvielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgendes Angebot:",
  "outroText": "Optional: Mehrsprachigkeit (EN) für 1.200,00 € netto.\\nWir freuen uns auf Ihre Rückmeldung.",
  "lines": [
    {
      "type": "einmalig",
      "title": "Konzeption & Design",
      "description": "Workshop, Sitemap, Wireframes\\nDesign Startseite + 3 Unterseiten",
      "quantity": 1,
      "unit": "pauschal",
      "unitPrice": 2400,
      "vatPercent": 19
    },
    {
      "type": "einmalig",
      "title": "Umsetzung",
      "description": "Entwicklung im CMS inkl. Responsive Design",
      "quantity": 32,
      "unit": "Stunden",
      "unitPrice": 95,
      "vatPercent": 19,
      "discountPercent": 10
    },
    {
      "type": "monatlich",
      "title": "Hosting & Wartung",
      "description": "Hosting, Updates, Backups",
      "quantity": 1,
      "unit": "pauschal",
      "unitPrice": 49,
      "vatPercent": 19
    }
  ]
}

Briefing / Schätzung:
`;

type ParsedLine = { title: string; description: string; quantity: number; unitPrice: number; discountPercent: number; vatPercent: number; lineType: "OneTime" | "RecurringMonthly"; unit: string };
type Parsed = { subject?: string; introText?: string; outroText?: string; lines: ParsedLine[] };

function fmt(n: number) {
  return (Number.isFinite(n) ? n : 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Akzeptiert Zahlen und Zahl-Strings ("1.250,50", "1250.50", "95 €"); liefert NaN bei Unsinn.
function toNumber(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  let s = v.replace(/[€\s]|EUR/gi, "");
  if (!s) return NaN;
  if (s.includes(",") && s.includes(".")) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
}

function toLineType(v: any): "OneTime" | "RecurringMonthly" | null {
  if (v == null || v === "") return "OneTime";
  const s = String(v).trim().toLowerCase();
  if (["einmalig", "onetime", "one-time", "once"].includes(s)) return "OneTime";
  if (["monatlich", "recurringmonthly", "monthly", "recurring"].includes(s)) return "RecurringMonthly";
  return null;
}

// Entfernt ```json-Fences und Prosa um das JSON-Objekt herum.
function extractJson(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Kein JSON-Objekt gefunden. Die Antwort muss mit { beginnen und mit } enden.");
  return s.slice(start, end + 1);
}

function optText(obj: any, key: string, errors: string[]): string | undefined {
  const v = obj[key];
  if (v == null) return undefined;
  if (typeof v !== "string") { errors.push(`"${key}" muss ein Text sein.`); return undefined; }
  return v.trim() || undefined;
}

function parseAgentAnswer(raw: string): { data?: Parsed; errors: string[] } {
  let obj: any;
  try {
    obj = JSON.parse(extractJson(raw));
  } catch (e: any) {
    return { errors: [e instanceof SyntaxError ? `Ungültiges JSON: ${e.message}` : e.message] };
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { errors: ["Erwartet wird ein JSON-Objekt mit \"lines\"."] };

  const errors: string[] = [];
  const subject = optText(obj, "subject", errors);
  const introText = optText(obj, "introText", errors);
  const outroText = optText(obj, "outroText", errors);

  if (!Array.isArray(obj.lines) || obj.lines.length === 0) {
    errors.push("\"lines\" fehlt oder ist leer – mindestens eine Position ist erforderlich.");
    return { errors };
  }

  const lines: ParsedLine[] = [];
  obj.lines.forEach((l: any, i: number) => {
    const p = `Position ${i + 1}`;
    if (!l || typeof l !== "object") { errors.push(`${p}: ist kein Objekt.`); return; }
    const title = typeof l.title === "string" ? l.title.trim() : "";
    if (!title) errors.push(`${p}: "title" fehlt.`);
    const lineType = toLineType(l.type);
    if (!lineType) errors.push(`${p}: unbekannter Typ "${l.type}" (erlaubt: "einmalig" oder "monatlich").`);
    const quantity = l.quantity == null ? 1 : toNumber(l.quantity);
    if (!(quantity > 0)) errors.push(`${p}: "quantity" muss eine Zahl größer 0 sein.`);
    const unitPrice = toNumber(l.unitPrice);
    if (l.unitPrice == null) errors.push(`${p}: "unitPrice" fehlt.`);
    else if (!(unitPrice >= 0)) errors.push(`${p}: "unitPrice" muss eine Zahl ≥ 0 sein.`);
    const vatPercent = l.vatPercent == null ? 19 : toNumber(l.vatPercent);
    if (![0, 7, 19].includes(vatPercent)) errors.push(`${p}: "vatPercent" muss 19, 7 oder 0 sein.`);
    const discountPercent = l.discountPercent == null ? 0 : toNumber(l.discountPercent);
    if (!(discountPercent >= 0 && discountPercent <= 100)) errors.push(`${p}: "discountPercent" muss zwischen 0 und 100 liegen.`);
    const unit = typeof l.unit === "string" ? l.unit.trim() : "";
    let description = typeof l.description === "string" ? l.description.trim() : "";
    // Positionen haben kein eigenes Einheiten-Feld – Einheit (ausser "pauschal") in die Beschreibung uebernehmen.
    if (unit && !/^(pauschal|stk\.?|stück)$/i.test(unit)) description = [description, `Einheit: ${unit}`].filter(Boolean).join("\n");
    lines.push({ title, description, quantity, unitPrice, discountPercent, vatPercent, lineType: lineType || "OneTime", unit });
  });

  if (errors.length) return { errors };
  return { data: { subject, introText, outroText, lines }, errors: [] };
}

function lineNet(l: { quantity: number; unitPrice: number; discountPercent?: number }) {
  return l.quantity * l.unitPrice * (1 - (l.discountPercent || 0) / 100);
}

export default function AgentImportModal({ quote, onClose, onSaved }: { quote: any; onClose: () => void; onSaved: (updated: any) => void }) {
  const [raw, setRaw] = useState("");
  const [mode, setMode] = useState<"replace" | "append">((quote.lines || []).length > 0 ? "append" : "replace");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const result = useMemo(() => (raw.trim() ? parseAgentAnswer(raw) : null), [raw]);
  const data = result?.data;
  const existingLines: any[] = quote.lines || [];

  const sumOneTime = (data?.lines || []).filter(l => l.lineType === "OneTime").reduce((s, l) => s + lineNet(l), 0);
  const sumMonthly = (data?.lines || []).filter(l => l.lineType === "RecurringMonthly").reduce((s, l) => s + lineNet(l), 0);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(AGENT_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kopieren nicht möglich – bitte den Prompt manuell aus dem aufgeklappten Bereich kopieren.");
    }
  }

  async function apply() {
    if (!data) return;
    if (mode === "replace" && existingLines.length > 0 && !confirm(`Dies ersetzt alle ${existingLines.length} aktuellen Positionen. Fortfahren?`)) return;

    const imported = data.lines.map(l => ({
      serviceCatalogItemId: null, subscriptionPlanId: null,
      title: l.title, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice,
      discountPercent: l.discountPercent, vatPercent: l.vatPercent, lineType: l.lineType,
    }));
    const kept = mode === "append"
      ? existingLines.map((l: any) => ({
          serviceCatalogItemId: l.serviceCatalogItemId ?? null, subscriptionPlanId: l.subscriptionPlanId ?? null,
          title: l.title, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice,
          discountPercent: l.discountPercent || 0, vatPercent: l.vatPercent, lineType: l.lineType,
        }))
      : [];
    const lines = [...kept, ...imported].map((l, i) => ({ ...l, sortOrder: i }));

    setSaving(true);
    setError("");
    try {
      let updated = await api.updateQuoteLines(quote.id, lines);
      // PUT /quotes/{id} ignoriert null-Felder – nur gesetzte Texte senden, alles andere bleibt unveraendert.
      if (data.subject || data.introText || data.outroText) {
        updated = await api.updateQuote(quote.id, { subject: data.subject ?? null, introText: data.introText ?? null, outroText: data.outroText ?? null });
      }
      onSaved(updated);
    } catch (e: any) {
      setError(e?.message || "Übernahme fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Vom Agent übernehmen – {quote.subject || quote.quoteNumber}</h2>
            <p className="text-xs text-muted mt-1">Angebot per Claude/ChatGPT aus einem Briefing erstellen lassen und hier einfügen.</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-6">
          {/* 1. Prompt */}
          <div>
            <h3 className="font-semibold mb-1">1. Prompt für den Agent kopieren</h3>
            <p className="text-sm text-muted mb-2">Prompt kopieren, im Chat einfügen und Briefing bzw. Schätzung darunter ergänzen. Der Agent antwortet nur mit JSON.</p>
            <div className="flex items-center gap-3">
              <button onClick={copyPrompt} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">{copied ? "Kopiert ✓" : "Prompt kopieren"}</button>
            </div>
            <details className="mt-2">
              <summary className="text-xs text-primary cursor-pointer">Prompt & Schema anzeigen</summary>
              <pre className="mt-2 p-3 bg-background border border-border rounded-lg text-xs whitespace-pre-wrap max-h-64 overflow-auto">{AGENT_PROMPT}</pre>
            </details>
          </div>

          {/* 2. Antwort */}
          <div>
            <h3 className="font-semibold mb-1">2. Antwort des Agents einfügen</h3>
            <textarea rows={8} value={raw} onChange={e => setRaw(e.target.value)} placeholder='{ "subject": "...", "lines": [ ... ] }' className="w-full px-3 py-2 border border-border rounded-lg text-xs font-mono" />
            {result && result.errors.length > 0 && (
              <div className="mt-2 bg-red-50 text-danger px-3 py-2 rounded-lg text-sm">
                <div className="font-medium mb-1">Antwort kann nicht übernommen werden:</div>
                <ul className="list-disc pl-5 space-y-0.5">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            )}
          </div>

          {data && (
            <div className="border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold">Vorschau</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-4"><span className="text-muted">Betreff</span><span className="text-right">{data.subject || <span className="text-muted">unverändert</span>}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted">Einleitungstext</span><span>{data.introText ? "wird gesetzt" : <span className="text-muted">unverändert</span>}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted">Schlusstext</span><span>{data.outroText ? "wird gesetzt" : <span className="text-muted">unverändert</span>}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted">Positionen</span><span>{data.lines.length}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted">Netto (einmalig)</span><span>{fmt(sumOneTime)} EUR</span></div>
                {sumMonthly > 0 && <div className="flex justify-between gap-4"><span className="text-muted">Netto (monatlich)</span><span>{fmt(sumMonthly)} EUR</span></div>}
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border"><th className="py-1 text-left text-xs text-muted">Titel</th><th className="py-1 text-left text-xs text-muted">Typ</th><th className="py-1 text-right text-xs text-muted">Menge</th><th className="py-1 text-right text-xs text-muted">Preis</th><th className="py-1 text-right text-xs text-muted">Gesamt</th></tr></thead>
                <tbody>
                  {data.lines.map((l, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="py-1.5">{l.title}</td>
                      <td className="py-1.5 text-xs">{l.lineType === "RecurringMonthly" ? "Monatlich" : "Einmalig"}</td>
                      <td className="py-1.5 text-right">{l.quantity}{l.unit ? ` ${l.unit}` : ""}</td>
                      <td className="py-1.5 text-right">{fmt(l.unitPrice)}</td>
                      <td className="py-1.5 text-right">{fmt(lineNet(l))}{l.discountPercent > 0 ? ` (−${l.discountPercent}%)` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-wrap gap-4 text-sm pt-1">
                <label className="flex items-center gap-2"><input type="radio" name="importMode" checked={mode === "replace"} onChange={() => setMode("replace")} />Positionen ersetzen</label>
                <label className="flex items-center gap-2"><input type="radio" name="importMode" checked={mode === "append"} onChange={() => setMode("append")} />Positionen anhängen{existingLines.length > 0 ? ` (an ${existingLines.length} bestehende)` : ""}</label>
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 text-danger px-3 py-2 rounded-lg text-sm">{error}</div>}
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">Abbrechen</button>
          <button onClick={apply} disabled={saving || !data} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
            {saving ? "Wird übernommen..." : "Übernehmen"}
          </button>
        </div>
      </div>
    </div>
  );
}
