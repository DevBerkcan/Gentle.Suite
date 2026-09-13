"use client";
import { RefreshCw, FileSignature } from "lucide-react";

export default function WorkspaceChooserPage() {
  function choose(target: "crm" | "contracts") {
    localStorage.setItem("workspace", target);
    window.location.href = target === "crm" ? "/dashboard" : "/contracts";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="brand-logo text-3xl text-primary">Gentle Suite<sup>®</sup></h1>
          <p className="text-muted mt-2">Welchen Bereich möchtest du öffnen?</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button
            onClick={() => choose("crm")}
            className="bg-surface border border-border rounded-2xl p-8 text-left hover:border-primary hover:shadow-md transition-all"
          >
            <RefreshCw className="w-8 h-8 text-primary mb-4" />
            <h2 className="text-lg font-semibold mb-1">CRM</h2>
            <p className="text-sm text-muted">Kunden, Angebote, Rechnungen, Serienrechnungen, Ratenzahlungen und alles rund um das Tagesgeschäft.</p>
          </button>
          <button
            onClick={() => choose("contracts")}
            className="bg-surface border border-border rounded-2xl p-8 text-left hover:border-primary hover:shadow-md transition-all"
          >
            <FileSignature className="w-8 h-8 text-primary mb-4" />
            <h2 className="text-lg font-semibold mb-1">Verträge</h2>
            <p className="text-sm text-muted">Agenturverträge vorbereiten, versenden und verwalten — Wartungsverträge, SEO-Verträge, Webdesign-Verträge und mehr.</p>
          </button>
        </div>
        <p className="text-center text-xs text-muted mt-8">Du kannst jederzeit oben in der Kopfzeile zwischen beiden Bereichen wechseln.</p>
      </div>
    </div>
  );
}
