"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Load the worker from a CDN rather than bundling it via `new URL(..., import.meta.url)`: the worker
// file's own ESM syntax (import.meta, top-level import/export) makes Next.js's production Terser pass
// fail to minify it as a webpack asset ("import.meta cannot be used outside of module code"), even
// though it works fine in dev. This file is only ever loaded client-side (via next/dynamic with
// ssr:false from the approval page, see page.tsx), so the CDN string itself is safe here — the crash
// this used to cause was specifically from evaluating it during Next.js's server-side render pass.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Props {
  file: string;
  numPages: number;
  scale: number | null;
  onLoadSuccess: (info: { numPages: number }) => void;
  onLoadError: () => void;
}

export default function PdfPreview({ file, numPages, scale, onLoadSuccess, onLoadError }: Props) {
  return (
    <Document
      file={file}
      onLoadSuccess={onLoadSuccess}
      onLoadError={onLoadError}
      loading={
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      {Array.from({ length: numPages }, (_, i) => (
        <div key={i} className="mb-3 shadow-lg">
          <Page pageNumber={i + 1} scale={scale ?? 1} renderTextLayer={true} renderAnnotationLayer={false} />
        </div>
      ))}
    </Document>
  );
}
