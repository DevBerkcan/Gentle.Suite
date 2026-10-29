"use client";
import { RefreshCw, Building2, FileSignature } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { workspaces, type Workspace } from "../components/workspaces";

const details: Record<Workspace, { icon: LucideIcon; text: string }> = {
  crm: { icon: RefreshCw, text: "Kunden, Angebote, Rechnungen, Serienrechnungen, Ratenzahlungen und alles rund um das Tagesgeschäft." },
  organisation: { icon: Building2, text: "Ausgaben, Buchhaltung und Verwaltung — Mitarbeiter, Leistungen, Rechtliches, Zugänge und Einstellungen." },
  contracts: { icon: FileSignature, text: "Agenturverträge und Schätzungen vorbereiten, versenden und verwalten." },
};

export default function WorkspaceChooserPage() {
  function choose(target: Workspace) {
    localStorage.setItem("workspace", target);
    window.location.href = workspaces.find(w => w.key === target)!.home;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy text-white p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="brand-logo text-4xl">Gentle Suite<sup>®</sup></h1>
          <p className="text-white/60 mt-3 text-[11px] uppercase tracking-[0.25em]">Welchen Bereich möchtest du öffnen?</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {workspaces.map(w => {
            const { icon: Icon, text } = details[w.key];
            return (
              <button
                key={w.key}
                onClick={() => choose(w.key)}
                className="border border-white/15 rounded-2xl p-8 text-left hover:border-accent hover:bg-white/5 transition-all"
              >
                <Icon className="w-8 h-8 text-accent mb-4" />
                <h2 className="font-display text-xl font-semibold mb-1">{w.label}</h2>
                <p className="text-sm text-white/60">{text}</p>
              </button>
            );
          })}
        </div>
        <p className="text-center text-[11px] uppercase tracking-[0.2em] text-white/40 mt-8">Du kannst jederzeit oben in der Kopfzeile zwischen den Bereichen wechseln.</p>
      </div>
    </div>
  );
}
