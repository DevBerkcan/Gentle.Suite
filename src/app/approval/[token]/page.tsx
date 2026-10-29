"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PdfPreviewBoundary from "./PdfPreviewBoundary";
import { api } from "@/lib/api";
import type { QuoteDetail } from "@/types/api";

// react-pdf/pdfjs-dist relies on browser-only globals and crashes if its module graph is evaluated
// during Next.js's server-side render pass (which happens even for "use client" components) — loading it
// only on the client via next/dynamic avoids that entirely. See PdfPreview.tsx.
const PdfPreview = dynamic(() => import("./PdfPreview"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#010A30] border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ── Gentle Group Studios brand tokens (scoped to this public approval page only) ──
// Navy #010A30 · Body #1B2140 · Muted #5B6180 · Light-on-navy #C9CDE0 · Hairline #DADDE8 · Fill #EEF0F6
const BRAND_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap";
const FONT_BODY = "font-['Public_Sans',system-ui,sans-serif]";
const FONT_HEAD = "font-['Space_Grotesk',system-ui,sans-serif]";
const BrandFonts = () => <link rel="stylesheet" href={BRAND_FONTS_HREF} />;

const PAGE = `min-h-screen text-[#1B2140] antialiased ${FONT_BODY}`;
const FOCUS = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#010A30] focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const FOCUS_ON_NAVY = "focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#010A30]";
const BTN_PRIMARY = `${FONT_HEAD} uppercase tracking-[0.12em] text-sm font-bold bg-[#010A30] hover:bg-[#1B2140] text-white rounded-[2px] transition-colors disabled:opacity-50 ${FOCUS}`;
const PANEL = "rounded-[2px] p-6 mb-8";
const H2 = `${FONT_HEAD} border-t-[1.5px] border-[#010A30] pt-3 text-base sm:text-lg font-bold uppercase tracking-[0.06em] text-[#010A30] mb-1`;
const LABEL = `${FONT_HEAD} block text-[11px] font-semibold uppercase tracking-[0.15em] text-[#5B6180] mb-1.5`;
const INPUT = "w-full bg-white border border-[#DADDE8] rounded-[2px] px-4 py-2.5 text-[#1B2140] text-sm focus:outline-none focus:border-[#010A30] focus:ring-1 focus:ring-[#010A30]";
const OPTION = "rounded-[2px] border p-4 text-sm leading-relaxed cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[#010A30] focus-within:ring-offset-1";
const OPTION_ON = "border-[#010A30] bg-[#EEF0F6]";
const OPTION_OFF = "border-[#DADDE8] bg-white hover:border-[#5B6180]";
const RADIO = "mt-1 accent-[#010A30]";

export default function ApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [comment, setComment] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [b2bAuthorityConfirmed, setB2bAuthorityConfirmed] = useState(false);
  const [chosenPaymentTermKey, setChosenPaymentTermKey] = useState("");
  const [chosenInstallmentMonths, setChosenInstallmentMonths] = useState<number | null>(null);
  const [installmentChoiceMade, setInstallmentChoiceMade] = useState(false);
  const [chosenPaymentPlanOptionKey, setChosenPaymentPlanOptionKey] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const signRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const pdfDirectUrl = `${API}/api/approval/${token}/pdf`;

  useEffect(() => {
    api
      .approval(token)
      .then((q) => {
        setQuote(q);
        setSignerEmail(q.primaryContactEmail || "");
        return fetch(pdfDirectUrl);
      })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.blob();
      })
      .then((blob) => {
        setPdfBlobUrl(URL.createObjectURL(blob));
      })
      .catch(() => {
        setExpired(true);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(imageData, 0, 0);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    function updateScale() {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setScale(0.59);
      } else {
        setScale(1);
      }
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  function getPos(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  }

  async function downloadSignedPdf() {
    if (!quote) return;
    setDownloading(true);
    try {
      const res = await fetch(pdfDirectUrl);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Angebot-${quote.quoteNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("PDF konnte nicht heruntergeladen werden. Bitte versuchen Sie es erneut.");
    } finally {
      setDownloading(false);
    }
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    isDrawing.current = true;
    const canvas = canvasRef.current!;
    const pos = getPos(e, canvas);
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDraw() {
    isDrawing.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function getSignatureDataUrl(): string | null {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const hasContent = Array.from(data).some((v, i) => i % 4 !== 3 && v < 250);
    if (!hasContent) return null;
    return canvas.toDataURL("image/png");
  }

  async function handleSign() {
    if (!signerName.trim() || !signerEmail.trim()) {
      alert("Bitte geben Sie den vollständigen Namen und die geschäftliche E-Mail-Adresse der unterzeichnenden Person an.");
      return;
    }
    if (!b2bAuthorityConfirmed) {
      alert("Bitte bestätigen Sie die Unternehmereigenschaft und Ihre Berechtigung zur Annahme des Angebots.");
      return;
    }
    if ((quote?.paymentTermOptions?.length ?? 0) > 0 && !chosenPaymentTermKey) {
      alert("Bitte wählen Sie eine Zahlungsbedingung aus.");
      return;
    }
    if ((quote?.installmentPeriodOptionsMonths?.length ?? 0) > 0 && (quote?.subtotalOneTime ?? 0) > 0 && !installmentChoiceMade) {
      alert("Bitte wählen Sie eine Zahlungsweise aus.");
      return;
    }
    if ((quote?.paymentPlanOptions?.length ?? 0) > 0 && !chosenPaymentPlanOptionKey) {
      alert("Bitte wählen Sie eine Zahlungsart aus.");
      return;
    }
    const sigData = getSignatureDataUrl();
    if (!sigData) {
      alert("Bitte unterschreiben Sie im Feld.");
      return;
    }
    setSubmitting(true);
    try {
      await api.processApproval(token, {
        accepted: true,
        signatureData: sigData,
        signedByName: signerName.trim(),
        signedByEmail: signerEmail.trim(),
        b2bAuthorityConfirmed,
        chosenPaymentTermKey: chosenPaymentTermKey || undefined,
        chosenInstallmentMonths: chosenInstallmentMonths ?? undefined,
        chosenPaymentPlanOptionKey: chosenPaymentPlanOptionKey || undefined,
        comment: "",
      });
      setDone(true);
    } catch {
      alert("Fehler beim Speichern. Bitte versuchen Sie es erneut.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    if (!comment.trim()) {
      alert("Bitte geben Sie einen Ablehnungsgrund an.");
      return;
    }
    setSubmitting(true);
    try {
      await api.processApproval(token, { accepted: false, comment });
      setDeclined(true);
    } catch {
      alert("Fehler beim Speichern. Bitte versuchen Sie es erneut.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className={`${PAGE} bg-white flex items-center justify-center`}>
        <BrandFonts />
        <div className="w-8 h-8 border-2 border-[#010A30] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (expired) {
    return (
      <div className={`${PAGE} bg-[#EEF0F6] flex items-center justify-center text-center px-4`}>
        <BrandFonts />
        <div className="max-w-md w-full bg-[#010A30] text-white rounded-[2px] px-6 py-10 sm:px-10">
          <p className={`${FONT_HEAD} text-2xl font-bold uppercase tracking-[0.06em] mb-3`}>Link abgelaufen</p>
          <p className="text-[#C9CDE0] text-sm leading-relaxed">
            Dieser Angebots-Link ist nicht mehr gültig. Bitte kontaktieren Sie uns.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={`${PAGE} bg-[#EEF0F6] flex items-center justify-center text-center px-4`}>
        <BrandFonts />
        <div className="max-w-md w-full bg-[#010A30] text-white rounded-[2px] px-6 py-10 sm:px-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[2px] border-[1.5px] border-[#4ADE80]/70 bg-[#15803D]/20 text-3xl">✅</div>
          <p className={`${FONT_HEAD} text-2xl font-bold uppercase tracking-[0.06em] mb-3`}>Angebot angenommen</p>
          <p className="text-[#C9CDE0] text-sm leading-relaxed mb-8">
            Vielen Dank. Ihre Unterschrift wurde erfolgreich gespeichert.
          </p>
          <button
            onClick={downloadSignedPdf}
            disabled={downloading}
            className={`${FONT_HEAD} inline-flex items-center justify-center gap-2 w-full bg-white hover:bg-[#EEF0F6] text-[#010A30] uppercase tracking-[0.12em] text-sm font-bold px-6 py-3 rounded-[2px] transition-colors disabled:opacity-50 ${FOCUS_ON_NAVY}`}
          >
            {downloading ? (
              <>
                <span className="w-4 h-4 border-2 border-[#010A30] border-t-transparent rounded-full animate-spin" />
                Wird geladen…
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
                Angebot als PDF herunterladen
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (declined) {
    return (
      <div className={`${PAGE} bg-[#EEF0F6] flex items-center justify-center text-center px-4`}>
        <BrandFonts />
        <div className="max-w-md w-full bg-[#010A30] text-white rounded-[2px] px-6 py-10 sm:px-10">
          <p className={`${FONT_HEAD} text-2xl font-bold uppercase tracking-[0.06em] mb-3`}>Angebot abgelehnt</p>
          <p className="text-[#C9CDE0] text-sm leading-relaxed">
            Wir haben Ihre Rückmeldung erhalten und werden uns bei Ihnen melden.
          </p>
        </div>
      </div>
    );
  }

  const ZOOM_STEP = 0.25;
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 3;

  return (
    <div className={`${PAGE} bg-white`}>
      <BrandFonts />
      <div ref={containerRef} className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex flex-col items-center text-center mb-10 bg-[#010A30] text-white rounded-[2px] px-6 py-10 sm:px-10 sm:py-12">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-6">
            <div className="absolute inset-0 rounded-[2px] border-[1.5px] border-[#C9CDE0]/40" />
            <div className="absolute inset-3 rounded-[2px] bg-white/10" />
            <div className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl select-none">📋</div>
          </div>
          <h1 className={`${FONT_HEAD} text-3xl sm:text-4xl font-bold uppercase tracking-[0.08em] mb-4`}>Angebot</h1>
          <p className="text-[#C9CDE0] text-sm leading-relaxed max-w-md whitespace-pre-wrap">
            {quote?.introText || "Vielen Dank für Ihr Interesse. Bitte prüfen Sie das nachfolgende Dokument sorgfältig. Wenn Sie damit einverstanden sind, unterschreiben Sie es am Ende mittels digitaler Signatur. Im Anschluss können Sie das Dokument als PDF herunterladen."}
          </p>
          <button
            onClick={() => signRef.current?.scrollIntoView({ behavior: "smooth" })}
            className={`${FONT_HEAD} mt-8 flex items-center gap-2 bg-white hover:bg-[#EEF0F6] text-[#010A30] uppercase tracking-[0.12em] text-sm font-bold px-6 py-3 rounded-[2px] transition-colors ${FOCUS_ON_NAVY}`}
          >
            Jetzt unterschreiben <span>↓</span>
          </button>
        </div>

        <div className="rounded-[2px] overflow-hidden border border-[#DADDE8] mb-8">
          <div className="bg-[#010A30] flex items-center justify-between px-4 py-2 text-sm text-white">
            <span className={`${FONT_HEAD} text-[11px] font-bold uppercase tracking-[0.15em]`}>PDF-Ansicht</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale((z) => Math.max(ZOOM_MIN, parseFloat(((z ?? 1) - ZOOM_STEP).toFixed(2))))}
                disabled={(scale ?? 1) <= ZOOM_MIN}
                className={`w-7 h-7 flex items-center justify-center rounded-[2px] border border-white/25 hover:bg-white/10 disabled:opacity-30 text-base font-bold ${FOCUS_ON_NAVY}`}
                title="Verkleinern"
              >
                −
              </button>
              <span className="w-12 text-center text-xs tabular-nums text-[#C9CDE0]">
                {Math.round((scale ?? 1) * 100)}%
              </span>
              <button
                onClick={() => setScale((z) => Math.min(ZOOM_MAX, parseFloat(((z ?? 1) + ZOOM_STEP).toFixed(2))))}
                disabled={(scale ?? 1) >= ZOOM_MAX}
                className={`w-7 h-7 flex items-center justify-center rounded-[2px] border border-white/25 hover:bg-white/10 disabled:opacity-30 text-base font-bold ${FOCUS_ON_NAVY}`}
                title="Vergrößern"
              >
                +
              </button>
              <button
                onClick={() => {
                  const isMobile = window.innerWidth < 768;
                  setScale(isMobile ? 0.59 : 1);
                }}
                className={`text-xs px-2 py-1 rounded-[2px] border border-white/25 hover:bg-white/10 ${FOCUS_ON_NAVY}`}
                title="Zurücksetzen"
              >
                1:1
              </button>
              <button
                onClick={downloadSignedPdf}
                disabled={downloading}
                className={`text-[#C9CDE0] hover:text-white ml-1 px-1 rounded-[2px] disabled:opacity-40 ${FOCUS_ON_NAVY}`}
                title="Herunterladen"
              >
                ⬇
              </button>
            </div>
          </div>

          <div
            ref={viewerRef}
            className="bg-[#EEF0F6] overflow-hidden relative"
            style={{
              maxHeight: 600,
              cursor: (scale ?? 1) > 1 ? (isPanning ? "grabbing" : "grab") : "default",
              userSelect: "none",
            }}
            onMouseDown={(e) => {
              if ((scale ?? 1) <= 1) return;
              setIsPanning(true);
              panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
            }}
            onMouseMove={(e) => {
              if (!isPanning || !panStart.current) return;
              setOffset({
                x: panStart.current.ox + (e.clientX - panStart.current.x),
                y: panStart.current.oy + (e.clientY - panStart.current.y),
              });
            }}
            onMouseUp={() => { setIsPanning(false); panStart.current = null; }}
            onMouseLeave={() => { setIsPanning(false); panStart.current = null; }}
            onTouchStart={(e) => {
              if ((scale ?? 1) <= 1) return;
              const t = e.touches[0];
              panStart.current = { x: t.clientX, y: t.clientY, ox: offset.x, oy: offset.y };
            }}
            onTouchMove={(e) => {
              if (!panStart.current) return;
              const t = e.touches[0];
              setOffset({
                x: panStart.current.ox + (t.clientX - panStart.current.x),
                y: panStart.current.oy + (t.clientY - panStart.current.y),
              });
            }}
            onTouchEnd={() => { panStart.current = null; }}
          >
            {pdfLoadError || !pdfBlobUrl ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4 p-6 text-[#5B6180] text-sm text-center">
                <p>Das PDF konnte nicht geladen werden.</p>
                <button
                  onClick={downloadSignedPdf}
                  disabled={downloading}
                  className={`${BTN_PRIMARY} px-5 py-2.5`}
                >
                  PDF herunterladen
                </button>
              </div>
            ) : (
              <div
                className="flex flex-col items-center py-4 gap-4"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                  transition: isPanning ? "none" : "transform 0.1s ease",
                  willChange: "transform",
                }}
              >
                <PdfPreviewBoundary onError={() => setPdfLoadError(true)} fallback={null}>
                  <PdfPreview
                    file={pdfBlobUrl}
                    numPages={numPages}
                    scale={scale}
                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    onLoadError={() => setPdfLoadError(true)}
                  />
                </PdfPreviewBoundary>
              </div>
            )}
          </div>
        </div>

        {quote?.outroText && (
          <div className={`${PANEL} bg-[#EEF0F6]`}>
            <p className="text-[#1B2140] text-sm leading-relaxed whitespace-pre-wrap">{quote.outroText}</p>
          </div>
        )}

        {(quote?.legalTextBlockOptions?.length ?? 0) > 0 && (
          <div className="mb-8">
            <h2 className={H2}>Beigefügte Rechtsdokumente</h2>
            <p className="text-[#5B6180] text-xs mb-4">Diese Dokumente sind Teil dieses Angebots.</p>
            <div className="border-t border-[#DADDE8]">
              {quote!.legalTextBlockOptions!.map((lt: any) => (
                <div key={lt.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 border-b border-[#DADDE8] px-1 py-3 text-sm">
                  <span className="text-[#1B2140] font-medium">{lt.title}</span>
                  {lt.attachmentFileName ? (
                    <a href={`${API}/api/approval/${token}/legal/${lt.key}`} target="_blank" rel="noopener noreferrer" className={`text-[#010A30] font-semibold underline decoration-[#DADDE8] underline-offset-4 hover:decoration-[#010A30] text-xs shrink-0 break-all rounded-[2px] ${FOCUS}`}>{lt.attachmentFileName} herunterladen</a>
                  ) : (
                    <span className="text-[#5B6180] text-xs shrink-0">siehe Angebots-PDF</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(quote?.paymentTermOptions?.length ?? 0) > 0 && (
          <div className="mb-8">
            <h2 className={H2}>Zahlungsbedingung wählen *</h2>
            <p className="text-[#5B6180] text-xs mb-4">Bitte wählen Sie eine der folgenden Zahlungsbedingungen aus.</p>
            <div className="space-y-3">
              {quote!.paymentTermOptions!.map((pt: any) => (
                <label key={pt.key} className={`flex items-start gap-3 ${OPTION} ${chosenPaymentTermKey === pt.key ? OPTION_ON : OPTION_OFF}`}>
                  <input type="radio" name="paymentTerm" className={RADIO} checked={chosenPaymentTermKey === pt.key} onChange={() => setChosenPaymentTermKey(pt.key)} />
                  <span>
                    <span className="block font-semibold text-[#010A30]">{pt.title}</span>
                    <span className="block text-[#5B6180] mt-0.5">{pt.content}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {(quote?.installmentPeriodOptionsMonths?.length ?? 0) > 0 && (quote?.subtotalOneTime ?? 0) > 0 && (
          <div className="mb-8">
            <h2 className={H2}>Zahlungsweise wählen *</h2>
            <p className="text-[#5B6180] text-xs mb-4">Sie können den einmaligen Betrag sofort oder in gleichen Monatsraten bezahlen.</p>
            <div className="space-y-3">
              <label className={`flex items-start gap-3 ${OPTION} ${installmentChoiceMade && chosenInstallmentMonths === null ? OPTION_ON : OPTION_OFF}`}>
                <input
                  type="radio"
                  name="installmentChoice"
                  className={RADIO}
                  checked={installmentChoiceMade && chosenInstallmentMonths === null}
                  onChange={() => { setChosenInstallmentMonths(null); setInstallmentChoiceMade(true); }}
                />
                <span className="block font-semibold text-[#010A30] tabular-nums">Gesamtbetrag jetzt bezahlen ({quote!.subtotalOneTime!.toFixed(2)} €)</span>
              </label>
              {quote!.installmentPeriodOptionsMonths!.map((m: number) => (
                <label key={m} className={`flex items-start gap-3 ${OPTION} ${chosenInstallmentMonths === m ? OPTION_ON : OPTION_OFF}`}>
                  <input
                    type="radio"
                    name="installmentChoice"
                    className={RADIO}
                    checked={chosenInstallmentMonths === m}
                    onChange={() => { setChosenInstallmentMonths(m); setInstallmentChoiceMade(true); }}
                  />
                  <span className="block font-semibold text-[#010A30] tabular-nums">{m} monatliche Raten à {(quote!.subtotalOneTime! / m).toFixed(2)} €</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {(quote?.paymentPlanOptions?.length ?? 0) > 0 && (
          <div className="mb-8">
            <h2 className={H2}>Zahlungsart wählen *</h2>
            <p className="text-[#5B6180] text-xs mb-4">Wählen Sie, wie Sie diesen Auftrag bezahlen möchten.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quote!.paymentPlanOptions!.map((opt: any) => (
                <label key={opt.key} className={`flex flex-col gap-2 ${OPTION} ${chosenPaymentPlanOptionKey === opt.key ? OPTION_ON : OPTION_OFF}`}>
                  <div className="flex items-start gap-3">
                    <input type="radio" name="paymentPlan" className={RADIO} checked={chosenPaymentPlanOptionKey === opt.key} onChange={() => setChosenPaymentPlanOptionKey(opt.key)} />
                    <span>
                      <span className={`${FONT_HEAD} block font-bold uppercase tracking-[0.06em] text-[#010A30]`}>{opt.title}</span>
                      <span className="block text-[#5B6180] mt-0.5 text-xs">{opt.subtitle}</span>
                    </span>
                  </div>
                  <div className="ml-7 text-xs text-[#1B2140] tabular-nums">
                    {opt.downPayment ? <div className="border-b border-[#DADDE8] py-1">Anzahlung: {Number(opt.downPayment).toFixed(2)} €</div> : null}
                    {opt.monthlyAmount ? <div className="border-b border-[#DADDE8] py-1">{Number(opt.monthlyAmount).toFixed(2)} € / Monat{opt.months ? ` über ${opt.months} Monate` : ""}</div> : null}
                    <div className="mt-1 bg-[#EEF0F6] px-2 py-1.5 font-bold text-[#010A30]">Gesamt: {Number(opt.totalAmount).toFixed(2)} €</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div ref={signRef} className="bg-white rounded-[2px] border border-[#DADDE8] border-t-[3px] border-t-[#010A30] p-5 sm:p-6">
          {quote?.customerName && (
            <div className="mb-5">
              <label className={LABEL}>Unternehmen</label>
              <div className="w-full bg-[#EEF0F6] border border-[#DADDE8] rounded-[2px] px-4 py-2.5 text-[#5B6180] text-sm select-none">
                {quote.customerName}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 mb-5">
            <div>
              <label className={LABEL}>Vor- und Nachname *</label>
              <input required value={signerName} onChange={(e) => setSignerName(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Geschäftliche E-Mail-Adresse *</label>
              <input required type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} className={INPUT} />
            </div>
          </div>

          <label className="mb-5 flex items-start gap-3 rounded-[2px] border border-[#DADDE8] bg-[#EEF0F6] p-4 text-sm leading-relaxed text-[#1B2140] cursor-pointer focus-within:ring-2 focus-within:ring-[#010A30] focus-within:ring-offset-1">
            <input type="checkbox" checked={b2bAuthorityConfirmed} onChange={(e) => setB2bAuthorityConfirmed(e.target.checked)} className="mt-1 accent-[#010A30]" />
            <span>Ich handle als Unternehmer im Sinne des § 14 BGB für das oben genannte Unternehmen und bin berechtigt, dieses Angebot verbindlich anzunehmen.</span>
          </label>

          <div className="mb-2">
            <label className={LABEL}>Unterschrift</label>
          </div>

          <div
            className="relative rounded-[2px] overflow-hidden bg-white border border-[#DADDE8] mb-4"
            style={{ touchAction: "none" }}
          >
            <button
              onClick={clearCanvas}
              className={`absolute top-2 right-2 z-10 text-[#5B6180] hover:text-[#010A30] text-lg leading-none bg-white border border-[#DADDE8] rounded-[2px] w-7 h-7 flex items-center justify-center ${FOCUS}`}
              title="Zurücksetzen"
              type="button"
            >
              ↺
            </button>
            <canvas
              ref={canvasRef}
              width={560}
              height={180}
              className="w-full block cursor-crosshair"
              style={{ touchAction: "none", display: "block" }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
          </div>

          <button
            type="button"
            onClick={handleSign}
            disabled={submitting}
            className={`${BTN_PRIMARY} w-full py-3.5 mb-6`}
          >
            {submitting ? "Wird gespeichert…" : "Jetzt unterschreiben"}
          </button>

          <details className="group border-t border-[#DADDE8] pt-4">
            <summary className={`${FONT_HEAD} text-xs font-semibold uppercase tracking-[0.15em] text-[#5B6180] cursor-pointer hover:text-[#010A30] list-none flex items-center gap-1.5 select-none rounded-[2px] w-fit ${FOCUS}`}>
              <span className="group-open:rotate-90 transition-transform inline-block">›</span>
              Angebot ablehnen
            </summary>
            <div className="mt-3">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Bitte geben Sie einen Ablehnungsgrund an…"
                className="w-full bg-white border border-[#DADDE8] rounded-[2px] px-4 py-2.5 text-[#1B2140] placeholder-[#5B6180]/70 focus:outline-none focus:border-[#B42318] focus:ring-1 focus:ring-[#B42318] text-sm resize-none mb-3"
              />
              <button
                type="button"
                onClick={handleDecline}
                disabled={submitting}
                className={`${FONT_HEAD} w-full bg-white border-[1.5px] border-[#B42318] text-[#B42318] hover:bg-[#B42318] hover:text-white disabled:opacity-50 uppercase tracking-[0.12em] font-bold py-2.5 rounded-[2px] transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B42318] focus-visible:ring-offset-2`}
              >
                Angebot ablehnen
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
