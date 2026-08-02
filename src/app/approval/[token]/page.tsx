"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { api } from "@/lib/api";
import type { QuoteDetail } from "@/types/api";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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
      <div className="min-h-screen bg-[#1a1f2e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-[#1a1f2e] flex items-center justify-center text-white text-center px-4">
        <div>
          <p className="text-2xl font-semibold mb-2">Link abgelaufen</p>
          <p className="text-slate-400 text-sm">
            Dieser Angebots-Link ist nicht mehr gültig. Bitte kontaktieren Sie uns.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#1a1f2e] flex items-center justify-center text-white text-center px-4">
        <div className="max-w-sm w-full">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-2xl font-semibold mb-2">Angebot angenommen</p>
          <p className="text-slate-400 text-sm mb-8">
            Vielen Dank. Ihre Unterschrift wurde erfolgreich gespeichert.
          </p>
          <button
            onClick={downloadSignedPdf}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            {downloading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
      <div className="min-h-screen bg-[#1a1f2e] flex items-center justify-center text-white text-center px-4">
        <div>
          <p className="text-2xl font-semibold mb-2">Angebot abgelehnt</p>
          <p className="text-slate-400 text-sm">
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
    <div className="min-h-screen bg-[#1a1f2e] text-white">
      <div ref={containerRef} className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="relative w-40 h-40 mb-6">
            <div className="absolute inset-0 rounded-full bg-[#2a3147]" />
            <div className="absolute inset-4 rounded-full bg-[#3b4568]" />
            <div className="absolute inset-0 flex items-center justify-center text-7xl select-none">📋</div>
          </div>
          <h1 className="text-3xl font-bold mb-4">Angebot</h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-md">
            Vielen Dank für Ihr Interesse. Bitte prüfen Sie das nachfolgende Dokument sorgfältig.
            Wenn Sie damit einverstanden sind, unterschreiben Sie es am Ende mittels digitaler Signatur.
            Im Anschluss können Sie das Dokument als PDF herunterladen.
          </p>
          <button
            onClick={() => signRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="mt-6 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Jetzt unterschreiben <span>↓</span>
          </button>
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-700 mb-8">
          <div className="bg-[#252b3b] flex items-center justify-between px-4 py-2 text-sm text-slate-300">
            <span>PDF-Ansicht</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale((z) => Math.max(ZOOM_MIN, parseFloat(((z ?? 1) - ZOOM_STEP).toFixed(2))))}
                disabled={(scale ?? 1) <= ZOOM_MIN}
                className="w-7 h-7 flex items-center justify-center rounded bg-[#1a1f2e] hover:bg-slate-700 disabled:opacity-30 text-base font-bold"
                title="Verkleinern"
              >
                −
              </button>
              <span className="w-12 text-center text-xs tabular-nums">
                {Math.round((scale ?? 1) * 100)}%
              </span>
              <button
                onClick={() => setScale((z) => Math.min(ZOOM_MAX, parseFloat(((z ?? 1) + ZOOM_STEP).toFixed(2))))}
                disabled={(scale ?? 1) >= ZOOM_MAX}
                className="w-7 h-7 flex items-center justify-center rounded bg-[#1a1f2e] hover:bg-slate-700 disabled:opacity-30 text-base font-bold"
                title="Vergrößern"
              >
                +
              </button>
              <button
                onClick={() => {
                  const isMobile = window.innerWidth < 768;
                  setScale(isMobile ? 0.59 : 1);
                }}
                className="text-xs px-2 py-1 rounded bg-[#1a1f2e] hover:bg-slate-700"
                title="Zurücksetzen"
              >
                1:1
              </button>
              <button
                onClick={downloadSignedPdf}
                disabled={downloading}
                className="hover:text-white ml-1 disabled:opacity-40"
                title="Herunterladen"
              >
                ⬇
              </button>
            </div>
          </div>

          <div
            ref={viewerRef}
            className="bg-[#2a3147] overflow-hidden relative"
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
              <div className="flex flex-col items-center justify-center h-64 gap-4 p-6 text-slate-400 text-sm text-center">
                <p>Das PDF konnte nicht geladen werden.</p>
                <button
                  onClick={downloadSignedPdf}
                  disabled={downloading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50"
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
                <Document
                  file={pdfBlobUrl}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  onLoadError={() => setPdfLoadError(true)}
                  loading={
                    <div className="flex items-center justify-center h-64">
                      <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  }
                >
                  {Array.from({ length: numPages }, (_, i) => (
                    <div key={i} className="mb-3 shadow-lg">
                      <Page
                        pageNumber={i + 1}
                        scale={scale ?? 1}
                        renderTextLayer={true}
                        renderAnnotationLayer={false}
                      />
                    </div>
                  ))}
                </Document>
              </div>
            )}
          </div>
        </div>

        <div ref={signRef} className="bg-[#252b3b] rounded-xl p-6 border border-slate-700">
          {quote?.customerName && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-300 mb-1">Unternehmen</label>
              <div className="w-full bg-[#1a1f2e] border border-slate-700 rounded-lg px-4 py-2.5 text-slate-400 text-sm select-none">
                {quote.customerName}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 mb-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Vor- und Nachname *</label>
              <input required value={signerName} onChange={(e) => setSignerName(e.target.value)} className="w-full bg-[#1a1f2e] border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Geschäftliche E-Mail-Adresse *</label>
              <input required type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} className="w-full bg-[#1a1f2e] border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <label className="mb-5 flex items-start gap-3 rounded-lg border border-slate-700 bg-[#1a1f2e] p-4 text-sm leading-relaxed text-slate-300">
            <input type="checkbox" checked={b2bAuthorityConfirmed} onChange={(e) => setB2bAuthorityConfirmed(e.target.checked)} className="mt-1" />
            <span>Ich handle als Unternehmer im Sinne des § 14 BGB für das oben genannte Unternehmen und bin berechtigt, dieses Angebot verbindlich anzunehmen.</span>
          </label>

          <div className="mb-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">Unterschrift</label>
          </div>

          <div
            className="relative rounded-lg overflow-hidden bg-white mb-4"
            style={{ touchAction: "none" }}
          >
            <button
              onClick={clearCanvas}
              className="absolute top-2 right-2 z-10 text-slate-400 hover:text-slate-600 text-lg leading-none bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-sm"
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
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors mb-6"
          >
            {submitting ? "Wird gespeichert…" : "Jetzt unterschreiben"}
          </button>

          <details className="group">
            <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300 list-none flex items-center gap-1 select-none">
              <span className="group-open:rotate-90 transition-transform inline-block">›</span>
              Angebot ablehnen
            </summary>
            <div className="mt-3">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Bitte geben Sie einen Ablehnungsgrund an…"
                className="w-full bg-[#1a1f2e] border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-sm resize-none mb-3"
              />
              <button
                type="button"
                onClick={handleDecline}
                disabled={submitting}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
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
