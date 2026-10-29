"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronDown, Copy, FileDown, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type {
  CustomerListItem,
  EstimateContent,
  EstimateDetail,
  EstimateItem,
  EstimateModule,
  EstimateStatus,
  EstimateTimelineRow,
  SaveEstimateRequest,
} from "@/types/api";
import {
  CLASSIFICATIONS,
  ESTIMATE_STATUS,
  defaultEstimate,
  emptyItem,
  emptyModule,
  emptyTimelineRow,
  formatEur,
  formatRange,
  karamanEstimate,
  sumRange,
  toForm,
  toPayload,
} from "./estimateDefaults";

const inputCls = "w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface";
const labelCls = "block text-xs font-medium text-muted mb-1";
const iconBtn = "p-1.5 rounded-md text-muted hover:text-text hover:bg-background disabled:opacity-30 disabled:hover:bg-transparent";

// ---------- small building blocks ----------

/** Textarea that grows with its content, so long bullets / descriptions are never clipped. */
function AutoTextarea({ value, onChange, placeholder, className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 2}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls} resize-none overflow-hidden ${className}`} />;
}

function Card({ title, hint, children, defaultOpen = true }: { title: string; hint?: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-surface border border-border rounded-xl mb-4">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 text-left">
        <div>
          <h2 className="font-semibold text-sm">{title}</h2>
          {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
        </div>
        <ChevronDown size={16} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-6 pb-6 space-y-4">{children}</div>}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function RowControls({ index, count, onMove, onRemove }: { index: number; count: number; onMove: (from: number, to: number) => void; onRemove: (i: number) => void }) {
  return (
    <div className="flex items-center shrink-0">
      <button type="button" title="Nach oben" className={iconBtn} disabled={index === 0} onClick={() => onMove(index, index - 1)}><ArrowUp size={14} /></button>
      <button type="button" title="Nach unten" className={iconBtn} disabled={index === count - 1} onClick={() => onMove(index, index + 1)}><ArrowDown size={14} /></button>
      <button type="button" title="Entfernen" className={`${iconBtn} hover:text-danger`} onClick={() => onRemove(index)}><Trash2 size={14} /></button>
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
      <Plus size={13} /> {children}
    </button>
  );
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

/** Repeatable bullet list; with `withLabel` each row has an optional bold lead-in label. `numbered` shows 01, 02, … */
function ItemList({ title, items, onChange, withLabel = false, numbered = false, placeholder }: {
  title?: string; items: EstimateItem[]; onChange: (items: EstimateItem[]) => void; withLabel?: boolean; numbered?: boolean; placeholder?: string;
}) {
  const set = (i: number, patch: Partial<EstimateItem>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <div>
      {title && <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{title}</h3>}
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="w-6 pt-2 text-xs font-semibold text-muted text-right shrink-0">{numbered ? String(i + 1).padStart(2, "0") : "•"}</span>
            {withLabel && (
              <input value={it.label ?? ""} onChange={(e) => set(i, { label: e.target.value })} placeholder="Label (fett, optional)" className="px-3 py-2 border border-border rounded-lg text-sm bg-surface w-44 shrink-0 font-medium" />
            )}
            <AutoTextarea value={it.text} onChange={(v) => set(i, { text: v })} placeholder={placeholder ?? "Text"} className="flex-1 min-w-0" />
            <RowControls index={i} count={items.length} onMove={(f, t) => onChange(move(items, f, t))} onRemove={(r) => onChange(items.filter((_, idx) => idx !== r))} />
          </div>
        ))}
      </div>
      <div className="mt-2 pl-8"><AddButton onClick={() => onChange([...items, emptyItem()])}>Eintrag hinzufügen</AddButton></div>
    </div>
  );
}

function parseNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Modul | Leistungsumfang | Pauschale von–bis, with a live range sum. */
function ModuleTable({ rows, onChange, sumLabel }: { rows: EstimateModule[]; onChange: (rows: EstimateModule[]) => void; sumLabel: string }) {
  const set = (i: number, patch: Partial<EstimateModule>) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const sum = sumRange(rows);
  return (
    <div>
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="px-3 py-2 text-left text-xs text-muted w-[28%]">Modul</th>
              <th className="px-3 py-2 text-left text-xs text-muted">Leistungsumfang</th>
              <th className="px-3 py-2 text-right text-xs text-muted w-28">von (€)</th>
              <th className="px-3 py-2 text-right text-xs text-muted w-28">bis (€)</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const invalid = r.priceFrom != null && r.priceTo != null && r.priceFrom > r.priceTo;
              return (
                <tr key={i} className="border-b border-border align-top">
                  <td className="px-2 py-2"><AutoTextarea value={r.title} onChange={(v) => set(i, { title: v })} placeholder="Modul" className="font-medium" /></td>
                  <td className="px-2 py-2"><AutoTextarea value={r.description ?? ""} onChange={(v) => set(i, { description: v })} placeholder="Leistungsumfang" /></td>
                  <td className="px-2 py-2"><input type="number" min={0} step={50} value={r.priceFrom ?? ""} onChange={(e) => set(i, { priceFrom: parseNum(e.target.value) })} className={`${inputCls} text-right ${invalid ? "border-danger" : ""}`} /></td>
                  <td className="px-2 py-2"><input type="number" min={0} step={50} value={r.priceTo ?? ""} onChange={(e) => set(i, { priceTo: parseNum(e.target.value) })} className={`${inputCls} text-right ${invalid ? "border-danger" : ""}`} /></td>
                  <td className="px-1 py-2"><RowControls index={i} count={rows.length} onMove={(f, t) => onChange(move(rows, f, t))} onRemove={(x) => onChange(rows.filter((_, idx) => idx !== x))} /></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-background">
              <td className="px-3 py-2.5 text-sm font-semibold" colSpan={2}>{sumLabel}</td>
              <td className="px-3 py-2.5 text-sm font-semibold text-right whitespace-nowrap" colSpan={2}>{formatRange(sum.from, sum.to)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mt-2"><AddButton onClick={() => onChange([...rows, emptyModule()])}>Zeile hinzufügen</AddButton></div>
    </div>
  );
}

function TimelineTable({ rows, onChange }: { rows: EstimateTimelineRow[]; onChange: (rows: EstimateTimelineRow[]) => void }) {
  const set = (i: number, patch: Partial<EstimateTimelineRow>) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div>
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="px-3 py-2 text-left text-xs text-muted w-[28%]">Phase</th>
              <th className="px-3 py-2 text-left text-xs text-muted w-[22%]">Zeitraum</th>
              <th className="px-3 py-2 text-left text-xs text-muted">Ergebnis</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border last:border-0 align-top">
                <td className="px-2 py-2"><input value={r.phase} onChange={(e) => set(i, { phase: e.target.value })} placeholder="Phase" className={`${inputCls} font-medium`} /></td>
                <td className="px-2 py-2"><input value={r.period ?? ""} onChange={(e) => set(i, { period: e.target.value })} placeholder="z. B. KW 47–48" className={inputCls} /></td>
                <td className="px-2 py-2"><AutoTextarea value={r.result ?? ""} onChange={(v) => set(i, { result: v })} placeholder="Ergebnis" /></td>
                <td className="px-1 py-2"><RowControls index={i} count={rows.length} onMove={(f, t) => onChange(move(rows, f, t))} onRemove={(x) => onChange(rows.filter((_, idx) => idx !== x))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2"><AddButton onClick={() => onChange([...rows, emptyTimelineRow()])}>Phase hinzufügen</AddButton></div>
    </div>
  );
}

// ---------- editor ----------

export default function EstimateEditor({ id }: { id?: string }) {
  const router = useRouter();
  const isNew = !id;
  const [estimate, setEstimate] = useState<EstimateDetail | null>(null);
  const [form, setForm] = useState<SaveEstimateRequest | null>(isNew ? defaultEstimate() : null);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "pdf" | "duplicate" | "delete">("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Kleinunternehmer (§ 19 UStG) show the fixed price as end price — same rule as the PDF
  const [smallBusiness, setSmallBusiness] = useState(false);

  useEffect(() => {
    api.customers("pageSize=500").then((r) => setCustomers(r.items)).catch(() => {});
    api.settings().then((s) => setSmallBusiness(s?.defaultTaxMode === "SmallBusiness")).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    api.estimate(id)
      .then((d) => { setEstimate(d); setForm(toForm(d)); setDirty(false); })
      .catch(() => setError("Schätzung konnte nicht geladen werden"));
  }, [id]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const sums = useMemo(() => ({
    modules: sumRange(form?.content.modules ?? []),
    extensions: sumRange(form?.content.extensions ?? []),
  }), [form]);

  if (!form) return <div className="p-8 text-muted">{error || "Lädt..."}</div>;

  const update = (patch: Partial<SaveEstimateRequest>) => { setForm({ ...form, ...patch }); setDirty(true); };
  const updateContent = <K extends keyof EstimateContent>(key: K, value: EstimateContent[K]) => {
    setForm({ ...form, content: { ...form.content, [key]: value } });
    setDirty(true);
  };
  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3500); };

  /** Saves and returns the stored estimate (navigates to the detail URL after the first save). */
  async function save(): Promise<EstimateDetail | null> {
    if (!form!.title.trim()) { setError("Bitte einen Titel angeben."); return null; }
    setError("");
    try {
      const payload = toPayload(form!);
      const saved = id ? await api.updateEstimate(id, payload) : await api.createEstimate(payload);
      setEstimate(saved);
      setForm(toForm(saved));
      setDirty(false);
      if (!id) router.replace(`/contracts/estimates/${saved.id}`);
      return saved;
    } catch (e: any) {
      setError(e?.message || "Speichern fehlgeschlagen");
      return null;
    }
  }

  async function onSave() {
    setBusy("save");
    const s = await save();
    setBusy("");
    if (s) flash("Gespeichert");
  }

  async function onPdf() {
    setBusy("pdf");
    try {
      const current = dirty || !estimate ? await save() : estimate;
      if (!current) return;
      const { blob } = await api.estimatePdfBlob(current.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Aufwandsschaetzung_${current.estimateNumber}_V${current.version}.pdf`.replace(/[^\w.\-]/g, "_");
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setError("PDF konnte nicht erstellt werden");
    } finally {
      setBusy("");
    }
  }

  async function onDuplicate() {
    if (!estimate) return;
    if (!confirm(`Neue Version von ${estimate.estimateNumber} anlegen?${dirty ? " Ungespeicherte Änderungen werden vorher gespeichert." : ""}`)) return;
    setBusy("duplicate");
    try {
      if (dirty && !(await save())) return;
      const copy = await api.duplicateEstimate(estimate.id);
      setDirty(false);
      router.push(`/contracts/estimates/${copy.id}`);
    } catch (e: any) {
      setError(e?.message || "Duplizieren fehlgeschlagen");
    } finally {
      setBusy("");
    }
  }

  async function onDelete() {
    if (!estimate || !confirm(`Schätzung ${estimate.estimateNumber} (V${estimate.version}) löschen?`)) return;
    setBusy("delete");
    try {
      await api.deleteEstimate(estimate.id);
      setDirty(false);
      router.push("/contracts/estimates");
    } catch (e: any) {
      setError(e?.message || "Löschen fehlgeschlagen");
      setBusy("");
    }
  }

  function loadExample() {
    if (dirty && !confirm("Das Formular mit dem KARAMAN-Beispiel überschreiben?")) return;
    const ex = karamanEstimate();
    const match = customers.find((c) => c.companyName.trim().toLowerCase() === (ex.customerDisplayName ?? "").trim().toLowerCase());
    setForm(match ? { ...ex, customerId: match.id, customerDisplayName: "" } : ex);
    setDirty(true);
  }

  const c = form.content;
  const status = (estimate?.status ?? form.status ?? "Draft") as EstimateStatus;
  const st = ESTIMATE_STATUS[status];
  const vat = form.fixedPrice != null ? Math.round(form.fixedPrice * 0.19 * 100) / 100 : null;
  const btn = "inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm font-medium hover:bg-background disabled:opacity-50";

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <a href="/contracts/estimates" className="text-xs text-muted hover:text-text">← Schätzungen</a>
          <h1 className="text-2xl font-bold mt-1">{isNew ? "Neue Schätzung" : form.title || "Schätzung"}</h1>
          <p className="text-sm text-muted mt-0.5">
            {estimate ? `${estimate.estimateNumber} · Version ${estimate.version}` : "Nummer wird beim Speichern vergeben"}
            {dirty && <span className="ml-2 text-orange-700">· ungespeicherte Änderungen</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${st.cls}`}>{st.label}</span>
          {isNew && <button type="button" onClick={loadExample} className={btn}><Sparkles size={14} /> KARAMAN-Beispiel laden</button>}
          {!isNew && <button type="button" onClick={onDuplicate} disabled={!!busy} className={btn}><Copy size={14} /> {busy === "duplicate" ? "Wird dupliziert..." : "Duplizieren / neue Version"}</button>}
          <button type="button" onClick={onPdf} disabled={!!busy} className={btn}><FileDown size={14} /> {busy === "pdf" ? "PDF wird erstellt..." : "PDF herunterladen"}</button>
          <button type="button" onClick={onSave} disabled={!!busy} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
            <Save size={14} /> {busy === "save" ? "Wird gespeichert..." : "Speichern"}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">×</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      <Card title="Kopfdaten" hint="Deckblatt und Metadaten der Schätzung">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Titel *" className="md:col-span-2"><input value={form.title} onChange={(e) => update({ title: e.target.value })} placeholder="z. B. Disposition & Fahrer-App" className={inputCls} /></Field>
          <Field label="Untertitel" className="md:col-span-2"><input value={form.subtitle ?? ""} onChange={(e) => update({ subtitle: e.target.value })} className={inputCls} /></Field>
          <Field label="Kunde">
            <select value={form.customerId ?? ""} onChange={(e) => update({ customerId: e.target.value || null })} className={inputCls}>
              <option value="">— kein Kunde verknüpft —</option>
              {customers.map((cu) => <option key={cu.id} value={cu.id}>{cu.companyName}</option>)}
            </select>
          </Field>
          <Field label="Erstellt für (Anzeigename, überschreibt Kundenname)">
            <input value={form.customerDisplayName ?? ""} onChange={(e) => update({ customerDisplayName: e.target.value })} placeholder={customers.find((cu) => cu.id === form.customerId)?.companyName ?? "z. B. KARAMAN GmbH"} className={inputCls} />
          </Field>
          <Field label="Version"><input value={form.version ?? ""} onChange={(e) => update({ version: e.target.value })} className={inputCls} /></Field>
          <Field label="Datum"><input type="date" value={form.date ?? ""} onChange={(e) => update({ date: e.target.value })} className={inputCls} /></Field>
          <Field label="Erstellt von"><input value={form.preparedBy ?? ""} onChange={(e) => update({ preparedBy: e.target.value })} className={inputCls} /></Field>
          <Field label="Freigegeben von"><input value={form.approvedBy ?? ""} onChange={(e) => update({ approvedBy: e.target.value })} className={inputCls} /></Field>
          <Field label="Verantwortlicher"><input value={form.responsible ?? ""} onChange={(e) => update({ responsible: e.target.value })} className={inputCls} /></Field>
          <Field label="Klassifizierung">
            <select value={form.classification ?? "vertraulich"} onChange={(e) => update({ classification: e.target.value })} className={inputCls}>
              {CLASSIFICATIONS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status ?? "Draft"} onChange={(e) => update({ status: e.target.value as EstimateStatus })} className={inputCls}>
              {(Object.keys(ESTIMATE_STATUS) as EstimateStatus[]).map((k) => <option key={k} value={k}>{ESTIMATE_STATUS[k].label}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <Card title="01 — Ausgangslage" hint="Leere Abschnitte erscheinen nicht im PDF">
        <Field label="Text"><textarea value={form.situationText ?? ""} onChange={(e) => update({ situationText: e.target.value })} rows={4} className={inputCls} /></Field>
        <ItemList title="Grundlage" items={c.basis} onChange={(v) => updateContent("basis", v)} withLabel />
        <ItemList title="Festlegungen" items={c.decisions} onChange={(v) => updateContent("decisions", v)} withLabel />
      </Card>

      <Card title="02 — Vorschlag Architektur, Umsetzung und Pilot">
        <Field label="Text"><textarea value={form.proposalText ?? ""} onChange={(e) => update({ proposalText: e.target.value })} rows={4} className={inputCls} /></Field>
        <ItemList title="Architektur" items={c.architecture} onChange={(v) => updateContent("architecture", v)} withLabel />
        <ItemList title="Umsetzung" items={c.implementation} onChange={(v) => updateContent("implementation", v)} withLabel />
        <ItemList title="Pilotbetrieb" items={c.pilot} onChange={(v) => updateContent("pilot", v)} withLabel />
      </Card>

      <Card title="03 — Aufwandsschätzung" hint="Nur Pauschalen (von–bis, netto) — keine Stundensätze">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Module</h3>
          <ModuleTable rows={c.modules} onChange={(v) => updateContent("modules", v)} sumLabel="Summe Module" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Bezeichnung Festpreis"><input value={form.fixedPriceLabel ?? ""} onChange={(e) => update({ fixedPriceLabel: e.target.value })} placeholder="Zielpreis/Festpreis" className={inputCls} /></Field>
          <Field label={smallBusiness ? "Festpreis (€, optional)" : "Festpreis netto (€, optional)"}>
            <input type="number" min={0} step={100} value={form.fixedPrice ?? ""} onChange={(e) => update({ fixedPrice: parseNum(e.target.value) })} className={`${inputCls} text-right`} />
          </Field>
          <div className="text-sm self-end pb-2 text-muted">
            {form.fixedPrice != null && smallBusiness
              ? <>Endpreis gem. § 19 UStG (keine USt)</>
              : form.fixedPrice != null && vat != null
              ? <>zzgl. 19 % USt {formatEur(vat, true)} = <span className="font-semibold text-text">{formatEur(form.fixedPrice + vat, true)} brutto</span></>
              : <>Ohne Festpreis zeigt das PDF die Spanne {formatRange(sums.modules.from, sums.modules.to)}.</>}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Ausbaustufen (optional)</h3>
          <ModuleTable rows={c.extensions} onChange={(v) => updateContent("extensions", v)} sumLabel="Summe Ausbaustufen" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Betrieb (Kostenübersicht)"><input value={form.operationText ?? ""} onChange={(e) => update({ operationText: e.target.value })} placeholder="z. B. Hosting & Wartung als monatliche Pauschale, separates Angebot" className={inputCls} /></Field>
          <Field label="Hinweis unter der Kostenübersicht"><textarea value={form.costNote ?? ""} onChange={(e) => update({ costNote: e.target.value })} rows={2} className={inputCls} /></Field>
        </div>
        <ItemList title="Annahmen und Abhängigkeiten" items={c.assumptions} onChange={(v) => updateContent("assumptions", v)} />
        <ItemList title="Nicht im Umfang enthalten" items={c.exclusions} onChange={(v) => updateContent("exclusions", v)} />
      </Card>

      <Card title="04 — Wesentliche Risiken">
        <ItemList items={c.risks} onChange={(v) => updateContent("risks", v)} withLabel placeholder="Beschreibung des Risikos" />
      </Card>

      <Card title="05 — Offene Fragen">
        <ItemList items={c.openQuestions} onChange={(v) => updateContent("openQuestions", v)} numbered placeholder="Frage" />
      </Card>

      <Card title="06 — Zeitplan">
        <TimelineTable rows={c.timeline} onChange={(v) => updateContent("timeline", v)} />
        <Field label="Hinweis zum Zeitplan"><textarea value={form.timelineNote ?? ""} onChange={(e) => update({ timelineNote: e.target.value })} rows={2} className={inputCls} /></Field>
      </Card>

      <Card title="07 — Nächste Schritte">
        <ItemList items={c.nextSteps} onChange={(v) => updateContent("nextSteps", v)} numbered placeholder="Schritt" />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
        <div>
          {estimate && estimate.status === "Draft" && (
            <button type="button" onClick={onDelete} disabled={!!busy} className="inline-flex items-center gap-1.5 text-sm text-danger hover:underline disabled:opacity-50">
              <Trash2 size={14} /> Entwurf löschen
            </button>
          )}
        </div>
        <button type="button" onClick={onSave} disabled={!!busy} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
          <Save size={14} /> {busy === "save" ? "Wird gespeichert..." : "Speichern"}
        </button>
      </div>
    </div>
  );
}
