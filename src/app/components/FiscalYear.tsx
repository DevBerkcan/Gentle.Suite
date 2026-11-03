"use client";
import { Lock } from "lucide-react";
import { selectFiscalYear, useFiscalYear, yearOf } from "@/lib/fiscalYear";

/** Jahres-Umschalter in der Kopfzeile. */
export function FiscalYearSwitch() {
  const { info, selected } = useFiscalYear();
  if (!info || info.years.length === 0) return null;
  return (
    <label className="flex items-center gap-1.5 text-xs text-white/70" title="Geschäftsjahr: filtert Angebote, Rechnungen und Schätzungen">
      <span className="hidden md:inline uppercase tracking-[0.15em]">Jahr</span>
      <select
        value={selected ?? info.current}
        onChange={(e) => selectFiscalYear(parseInt(e.target.value, 10))}
        className="bg-white/10 border border-white/15 rounded-full px-3 py-1 text-white text-sm outline-none focus:border-accent"
      >
        {[...info.years].reverse().map((y) => (
          <option key={y} value={y} className="text-navy">{y}{info.closedYears.includes(y) ? " (abgeschlossen)" : ""}</option>
        ))}
      </select>
    </label>
  );
}

/** Hinweis für Listen: das gewählte Jahr ist abgeschlossen. */
export function ClosedYearListNotice() {
  const { info, selected, selectedIsClosed } = useFiscalYear();
  if (!info || !selectedIsClosed) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
      <Lock size={16} className="mt-0.5 shrink-0" />
      <span>Das Geschäftsjahr <strong>{selected}</strong> ist abgeschlossen – nur Lesen. Neue Belege entstehen immer in {info.current}; zum Anlegen oben auf {info.current} wechseln.</span>
    </div>
  );
}

/** Hinweis auf Detailseiten, wenn der Beleg zu einem abgeschlossenen Jahr gehört. */
export function ClosedYearDocumentNotice({ date, what }: { date?: string | null; what: string }) {
  const { info, isClosed } = useFiscalYear();
  const year = yearOf(date);
  if (!info || !isClosed(year)) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
      <Lock size={16} className="mt-0.5 shrink-0" />
      <span>{what} stammt aus dem abgeschlossenen Geschäftsjahr <strong>{year}</strong> und kann nur noch angesehen werden. Zahlungen und Stornos sind weiterhin möglich; für Änderungen bitte ein neues Dokument in {info.current} anlegen.</span>
    </div>
  );
}
