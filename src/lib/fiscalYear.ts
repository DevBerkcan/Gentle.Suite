"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "./api";

/** Geschäftsjahr-Auswahl (Kopfzeile): filtert Angebote, Rechnungen und Schätzungen. Abgeschlossene Jahre sind nur lesbar. */
export type FiscalYearInfo = { current: number; years: number[]; closedYears: number[]; firstYearWithYearInNumber: number };

const STORAGE_KEY = "gs_fiscal_year";
let infoPromise: Promise<FiscalYearInfo> | null = null;

export function loadFiscalYearInfo(): Promise<FiscalYearInfo> {
  infoPromise ??= apiFetch<FiscalYearInfo>("/fiscal-year").catch((e) => { infoPromise = null; throw e; });
  return infoPromise;
}

/** Gewähltes Jahr aus dem Browser; null = noch nie gewählt (dann gilt das laufende Jahr). */
export function storedFiscalYear(): number | null {
  if (typeof window === "undefined") return null;
  try { const v = parseInt(localStorage.getItem(STORAGE_KEY) || "", 10); return Number.isFinite(v) ? v : null; } catch { return null; }
}

export function selectFiscalYear(year: number) {
  try { localStorage.setItem(STORAGE_KEY, String(year)); } catch { /* privates Fenster: Auswahl gilt nur bis zum Neuladen */ }
  window.location.reload();
}

/** Hängt year=… an Listenabfragen, sofern nicht bereits gesetzt. Ohne Auswahl wird das laufende Jahr angezeigt. */
export async function withFiscalYear(params: string): Promise<string> {
  const q = new URLSearchParams(params);
  if (q.has("year")) return params;
  let year = storedFiscalYear();
  if (year == null) { try { year = (await loadFiscalYearInfo()).current; } catch { return params; } }
  q.set("year", String(year));
  return q.toString();
}

export function useFiscalYear() {
  const [info, setInfo] = useState<FiscalYearInfo | null>(null);
  useEffect(() => { loadFiscalYearInfo().then(setInfo).catch(() => {}); }, []);
  const selected = storedFiscalYear() ?? info?.current ?? null;
  const isClosed = (year: number | null | undefined) => !!info && year != null && year < info.current;
  return { info, selected, selectedIsClosed: isClosed(selected), isClosed };
}

/** Berliner Kalenderjahr eines Datums. */
export const yearOf = (iso?: string | null) =>
  iso ? parseInt(new Date(iso).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", year: "numeric" }), 10) : null;
