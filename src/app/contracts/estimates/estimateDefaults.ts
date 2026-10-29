import type {
  EstimateContent,
  EstimateDetail,
  EstimateItem,
  EstimateModule,
  EstimateStatus,
  EstimateTimelineRow,
  SaveEstimateRequest,
} from "@/types/api";
import karamanExample from "./karaman-example.json";

export const ESTIMATE_STATUS: Record<EstimateStatus, { label: string; cls: string }> = {
  Draft: { label: "Entwurf", cls: "bg-gray-100 text-gray-700" },
  Sent: { label: "Versendet", cls: "bg-orange-50 text-orange-700" },
  Accepted: { label: "Angenommen", cls: "bg-green-50 text-success" },
  Rejected: { label: "Abgelehnt", cls: "bg-red-50 text-danger" },
};

export const CLASSIFICATIONS = ["intern", "vertraulich", "öffentlich"] as const;

const eur = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const eurCents = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatEur = (v: number, cents = false) => `${(cents ? eurCents : eur).format(v)} €`;
export const formatRange = (from: number, to: number) => (from === to ? formatEur(from) : `${eur.format(from)} – ${formatEur(to)}`);

/** Same rule as the API (EstimateJson.Range): a row with only one bound counts that bound on both sides. */
export function sumRange(rows: EstimateModule[]): { from: number; to: number } {
  return rows.reduce(
    (acc, r) => {
      const f = r.priceFrom ?? r.priceTo ?? 0;
      const t = r.priceTo ?? r.priceFrom ?? 0;
      return { from: acc.from + Number(f), to: acc.to + Number(t) };
    },
    { from: 0, to: 0 },
  );
}

export const emptyItem = (): EstimateItem => ({ label: "", text: "" });
export const emptyModule = (): EstimateModule => ({ title: "", description: "", priceFrom: null, priceTo: null });
export const emptyTimelineRow = (): EstimateTimelineRow => ({ phase: "", period: "", result: "" });
const items = (...texts: string[]): EstimateItem[] => texts.map((text) => ({ label: "", text }));

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Prefill for "Neue Schätzung": the seven-section structure with sensible defaults and one empty row per list. */
export function defaultEstimate(): SaveEstimateRequest {
  return {
    customerId: null,
    customerDisplayName: "",
    title: "",
    subtitle: "",
    version: "1.0",
    date: todayIso(),
    preparedBy: "",
    approvedBy: "",
    responsible: "",
    classification: "vertraulich",
    status: "Draft",
    fixedPrice: null,
    fixedPriceLabel: "Zielpreis/Festpreis",
    situationText: "",
    proposalText: "",
    costNote:
      "Alle Preise sind Pauschalen zzgl. gesetzlicher USt. Die Spannen dienen der Orientierung; der verbindliche Festpreis wird nach Klärung der offenen Fragen im Angebot festgelegt.",
    operationText: "",
    timelineNote: "",
    content: {
      basis: [emptyItem()],
      decisions: [emptyItem()],
      architecture: [emptyItem()],
      implementation: [emptyItem()],
      pilot: [emptyItem()],
      modules: [emptyModule()],
      extensions: [],
      assumptions: items(
        "Ein fester Ansprechpartner steht für Rückfragen zeitnah zur Verfügung",
        "Benötigte Zugänge, Daten und Inhalte werden rechtzeitig bereitgestellt",
      ),
      exclusions: items("Hosting-, Lizenz- und Drittanbieterkosten", "Inhaltserstellung (Texte, Bilder), sofern nicht ausdrücklich genannt"),
      risks: [emptyItem()],
      openQuestions: [emptyItem()],
      timeline: [
        { phase: "Analyse & Konzept", period: "", result: "" },
        { phase: "Umsetzung", period: "", result: "" },
        { phase: "Test & Pilot", period: "", result: "" },
        { phase: "Go-Live", period: "", result: "" },
      ],
      nextSteps: items(
        "Rückmeldung zur Ersteinschätzung und Klärung der offenen Fragen",
        "Gemeinsamer Workshop zur Detailanalyse",
        "Verbindliches Angebot zum Festpreis",
        "Beauftragung und Projektstart",
      ),
    },
  };
}

/** The KARAMAN GmbH example (Fahrer-App & Disposition) — only loaded into the form, saved when the user clicks Speichern. */
export function karamanEstimate(): SaveEstimateRequest {
  const ex = JSON.parse(JSON.stringify(karamanExample)) as SaveEstimateRequest;
  return { ...ex, date: todayIso(), status: "Draft" };
}

function normalizeContent(c?: Partial<EstimateContent> | null): EstimateContent {
  return {
    basis: c?.basis ?? [],
    decisions: c?.decisions ?? [],
    architecture: c?.architecture ?? [],
    implementation: c?.implementation ?? [],
    pilot: c?.pilot ?? [],
    modules: c?.modules ?? [],
    extensions: c?.extensions ?? [],
    assumptions: c?.assumptions ?? [],
    exclusions: c?.exclusions ?? [],
    risks: c?.risks ?? [],
    openQuestions: c?.openQuestions ?? [],
    timeline: c?.timeline ?? [],
    nextSteps: c?.nextSteps ?? [],
  };
}

/** Loaded detail → editable form state. */
export function toForm(d: EstimateDetail): SaveEstimateRequest {
  return {
    customerId: d.customerId ?? null,
    customerDisplayName: d.customerDisplayName ?? "",
    title: d.title ?? "",
    subtitle: d.subtitle ?? "",
    version: d.version ?? "1.0",
    date: (d.date ?? "").slice(0, 10),
    preparedBy: d.preparedBy ?? "",
    approvedBy: d.approvedBy ?? "",
    responsible: d.responsible ?? "",
    classification: d.classification ?? "vertraulich",
    status: d.status,
    fixedPrice: d.fixedPrice ?? null,
    fixedPriceLabel: d.fixedPriceLabel ?? "",
    situationText: d.situationText ?? "",
    proposalText: d.proposalText ?? "",
    costNote: d.costNote ?? "",
    operationText: d.operationText ?? "",
    timelineNote: d.timelineNote ?? "",
    content: normalizeContent(d.content),
  };
}

const keepItem = (i: EstimateItem) => !!(i.text?.trim() || i.label?.trim());

/** Form state → API payload: drops fully empty rows so the PDF and the stored JSON stay clean. */
export function toPayload(f: SaveEstimateRequest): SaveEstimateRequest {
  const c = f.content;
  const keepModule = (m: EstimateModule) => !!(m.title?.trim() || m.description?.trim() || m.priceFrom != null || m.priceTo != null);
  return {
    ...f,
    customerId: f.customerId || null,
    date: f.date || null,
    content: {
      basis: c.basis.filter(keepItem),
      decisions: c.decisions.filter(keepItem),
      architecture: c.architecture.filter(keepItem),
      implementation: c.implementation.filter(keepItem),
      pilot: c.pilot.filter(keepItem),
      modules: c.modules.filter(keepModule),
      extensions: c.extensions.filter(keepModule),
      assumptions: c.assumptions.filter(keepItem),
      exclusions: c.exclusions.filter(keepItem),
      risks: c.risks.filter(keepItem),
      openQuestions: c.openQuestions.filter(keepItem),
      timeline: c.timeline.filter((t) => !!(t.phase?.trim() || t.period?.trim() || t.result?.trim())),
      nextSteps: c.nextSteps.filter(keepItem),
    },
  };
}
