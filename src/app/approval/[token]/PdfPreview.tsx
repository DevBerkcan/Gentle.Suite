"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Bundle the worker via the installed pdfjs-dist package instead of a CDN <script> tag, and only ever
// import/evaluate react-pdf in the browser (this file is loaded via next/dynamic with ssr:false from the
// approval page) — pdfjs-dist relies on browser-only globals and crashes ("Object.defineProperty called
// on non-object") if its module graph gets evaluated during Next.js's server-side render pass.
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

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
