import type { EstimateItem, EstimateModule, SaveEstimateRequest } from "@/types/api";
import { defaultEstimate, karamanEstimate } from "./estimateDefaults";

/* Vorlagen pro Projektart: vollständig vorbefüllte Schätzungen, die nur noch angepasst werden müssen.
   Preise sind Orientierungsspannen (netto, Pauschalen) und werden je Projekt überschrieben. */

const it = (...texts: string[]): EstimateItem[] => texts.map((text) => ({ label: "", text }));
const lb = (...pairs: [string, string][]): EstimateItem[] => pairs.map(([label, text]) => ({ label, text }));
const mod = (title: string, description: string, priceFrom: number, priceTo: number): EstimateModule => ({ title, description, priceFrom, priceTo });

function preset(patch: Partial<SaveEstimateRequest>, content: Partial<SaveEstimateRequest["content"]>): SaveEstimateRequest {
  const base = defaultEstimate();
  return { ...base, ...patch, content: { ...base.content, ...content } };
}

export type EstimatePreset = { key: string; label: string; hint: string; build: () => SaveEstimateRequest };

export const ESTIMATE_PRESETS: EstimatePreset[] = [
  {
    key: "website", label: "Website", hint: "Unternehmensseite / Landingpage",
    build: () => preset(
      { title: "Neue Unternehmenswebsite", subtitle: "Konzept, Design und Umsetzung",
        situationText: "Der Kunde benötigt einen modernen, mobil optimierten Webauftritt, der das Angebot klar darstellt und Anfragen erzeugt.",
        proposalText: "Wir erstellen eine schnelle, responsive Website mit klarer Struktur, verkaufsstarken Call-to-Actions und SEO-Grundlagen. Inhalte pflegt der Kunde anschließend selbst.",
        operationText: "Hosting & Wartung: monatliche Pauschale, separates Angebot",
        timelineNote: "Die Dauer hängt maßgeblich von der rechtzeitigen Lieferung der Inhalte ab." },
      {
        basis: it("Erstgespräch und Briefing des Kunden", "Bestehende Inhalte und Corporate Design (sofern vorhanden)"),
        decisions: lb(["Technik", "Modernes CMS bzw. performantes Framework, mobil optimiert"], ["Umfang", "Bis zu 5 Unterseiten bzw. eine Single Page mit Sektionen"]),
        modules: [
          mod("Konzept & Struktur", "Zielgruppe, Seitenstruktur, Inhaltskonzept, Call-to-Actions", 150, 300),
          mod("Design", "Individuelles Webdesign für Desktop und Smartphone, eine Korrekturschleife", 300, 700),
          mod("Umsetzung", "Responsive Entwicklung, Kontaktformular, Einbindung der Inhalte", 500, 1500),
          mod("SEO-Grundlagen", "Meta-Daten, Ladezeit, strukturierte Daten, Search Console", 150, 300),
          mod("Rechtliches & Sicherheit", "Impressum/Datenschutz per Generator einbinden, SSL, Cookie-Hinweis falls nötig", 50, 150),
          mod("Go-Live", "Hosting-Einrichtung, Domain-Anbindung, 30 Tage Support nach Veröffentlichung", 50, 150),
        ],
        extensions: [mod("Mehrsprachigkeit", "Zweite Sprache inkl. Umschalter", 300, 600), mod("Blog / News", "Beitragsbereich mit Kategorien", 250, 500), mod("Online-Terminbuchung", "Einbindung eines Buchungstools", 150, 400)],
        exclusions: it("Texterstellung und Fotografie", "Hosting- und Domainkosten", "Laufende Wartung (separates Angebot)"),
        risks: lb(["Inhalte", "Verspätete Lieferung von Texten und Bildern verschiebt den Go-Live"]),
        openQuestions: it("Sind Logo und Farben vorhanden?", "Wer liefert Texte und Bilder?", "Bestehende Domain und Hosting?"),
        timeline: [
          { phase: "Konzept", period: "Woche 1", result: "Struktur & Inhaltsplan" },
          { phase: "Design", period: "Woche 2", result: "Freigegebenes Design" },
          { phase: "Umsetzung", period: "Woche 3–4", result: "Testversion" },
          { phase: "Go-Live", period: "Woche 5", result: "Website online" },
        ],
      }),
  },
  {
    key: "software", label: "Software / Portal", hint: "Webanwendung, Kundenportal, internes Tool",
    build: () => preset(
      { title: "Individuelle Webanwendung", subtitle: "Konzept, Entwicklung und Einführung",
        situationText: "Prozesse laufen heute manuell (z. B. per E-Mail und Excel). Ziel ist eine zentrale Anwendung, die Abläufe digitalisiert und Fehler reduziert.",
        proposalText: "Wir entwickeln eine webbasierte Anwendung mit Rollen- und Rechtekonzept, die schrittweise eingeführt wird: zuerst ein schlanker Kern (MVP), danach Ausbaustufen.",
        operationText: "Hosting, Wartung & Support: monatliche Pauschale, separates Angebot" },
      {
        basis: it("Workshop zur Prozessaufnahme", "Vorhandene Daten, Listen und Formulare des Kunden"),
        decisions: lb(["Architektur", "Webanwendung (Browser), API-basiertes Backend, relationale Datenbank"], ["Vorgehen", "MVP zuerst, Erweiterungen als Ausbaustufen"]),
        architecture: it("Frontend: moderne Web-Oberfläche, responsive", "Backend: REST-API mit Authentifizierung", "Datenbank: SQL, tägliche Sicherung"),
        modules: [
          mod("Analyse & Konzept", "Prozessaufnahme, Anforderungen, Datenmodell, Klickprototyp", 800, 1500),
          mod("UX/UI-Design", "Oberflächen der Kernprozesse, Designsystem", 800, 2000),
          mod("Backend & Datenbank", "Datenmodell, Geschäftslogik, REST-API", 2500, 5000),
          mod("Frontend", "Masken, Listen, Formulare, Dashboards", 2000, 4000),
          mod("Benutzer & Rechte", "Login, Rollen, Rechte, Passwort-Reset", 500, 1200),
          mod("Test & Einführung", "Tests, Datenübernahme, Schulung, Go-Live-Begleitung", 500, 1000),
        ],
        extensions: [mod("Mobile App", "Begleit-App für unterwegs", 4000, 9000), mod("Schnittstellen", "Anbindung Buchhaltung/ERP", 1000, 3000)],
        assumptions: it("Ein fester Ansprechpartner trifft fachliche Entscheidungen zeitnah", "Testdaten werden bereitgestellt"),
        exclusions: it("Hosting-, Lizenz- und Drittanbieterkosten", "Datenbereinigung von Altbeständen", "Funktionen außerhalb der Leistungsbeschreibung"),
        risks: lb(["Umfang", "Neue Anforderungen während der Umsetzung erhöhen Aufwand und Dauer"], ["Daten", "Qualität der Altdaten beeinflusst die Datenübernahme"]),
        openQuestions: it("Welche Rollen gibt es und wer darf was?", "Welche Systeme müssen angebunden werden?", "Gibt es Vorgaben zu Hosting und Datenschutz?"),
        timeline: [
          { phase: "Analyse & Konzept", period: "Woche 1–2", result: "Freigegebenes Konzept" },
          { phase: "Umsetzung MVP", period: "Woche 3–8", result: "Testsystem" },
          { phase: "Test & Pilot", period: "Woche 9–10", result: "Abnahme" },
          { phase: "Go-Live", period: "Woche 11", result: "Produktivbetrieb" },
        ],
      }),
  },
  {
    key: "api", label: "API / Schnittstelle", hint: "Systeme verbinden, Daten synchronisieren",
    build: () => preset(
      { title: "Schnittstellen-Integration", subtitle: "Anbindung und Datenaustausch zwischen Systemen",
        situationText: "Daten werden heute zwischen mehreren Systemen manuell übertragen. Das kostet Zeit und führt zu Fehlern.",
        proposalText: "Wir entwickeln eine Schnittstelle, die die Daten automatisch und nachvollziehbar zwischen den Systemen austauscht, inklusive Fehlerbehandlung und Protokollierung.",
        operationText: "Betrieb & Anpassung an API-Änderungen der Anbieter: Wartungsvertrag, separates Angebot" },
      {
        basis: it("API-Dokumentationen der beteiligten Systeme", "Testzugänge und API-Schlüssel des Kunden"),
        decisions: lb(["Richtung", "Ein- oder beidseitige Synchronisation, festgelegt im Konzept"], ["Auslöser", "Ereignisgesteuert (Webhook) oder zeitgesteuert"]),
        modules: [
          mod("Analyse & Mapping", "Datenfelder, Zuordnung, Sonderfälle, Ablaufdiagramm", 300, 800),
          mod("Entwicklung Connector", "Abruf, Umwandlung und Übertragung der Daten", 1000, 3000),
          mod("Authentifizierung & Sicherheit", "OAuth/API-Keys, verschlüsselte Ablage der Zugangsdaten", 300, 800),
          mod("Fehlerbehandlung & Monitoring", "Wiederholungen, Benachrichtigung bei Fehlern, Protokoll", 300, 700),
          mod("Tests & Dokumentation", "Testfälle, technische Dokumentation, Übergabe", 300, 800),
        ],
        assumptions: it("Die Anbieter-APIs stellen die benötigten Daten bereit", "Testumgebungen stehen zur Verfügung"),
        exclusions: it("Kosten und Verträge der Drittanbieter", "Anpassungen an spätere API-Änderungen Dritter (Wartung)"),
        risks: lb(["Drittanbieter", "Limits, fehlende Felder oder Änderungen der Anbieter-API"]),
        openQuestions: it("Welche Systeme und welche Datenmengen?", "Wie aktuell müssen die Daten sein (Echtzeit/täglich)?", "Wer bekommt Fehlermeldungen?"),
        timeline: [
          { phase: "Analyse", period: "Woche 1", result: "Mapping freigegeben" },
          { phase: "Entwicklung", period: "Woche 2–3", result: "Testlauf" },
          { phase: "Test & Go-Live", period: "Woche 4", result: "Produktiver Datenaustausch" },
        ],
      }),
  },
  {
    key: "app", label: "App", hint: "iOS & Android",
    build: () => preset(
      { title: "Mobile App", subtitle: "Konzept, Design, Entwicklung und Store-Veröffentlichung",
        proposalText: "Wir entwickeln eine plattformübergreifende App für iOS und Android mit gemeinsamer Codebasis und einem Backend für Daten und Benutzer.",
        operationText: "Backend-Hosting, Updates & Store-Pflege: monatliche Pauschale, separates Angebot" },
      {
        decisions: lb(["Technik", "Cross-Platform (eine Codebasis für iOS und Android)"], ["Konten", "Veröffentlichung über die Entwicklerkonten des Kunden"]),
        modules: [
          mod("Konzept & Design", "User Flows, Screens, Klickprototyp", 1000, 2500),
          mod("App-Entwicklung", "Screens, Navigation, Offline-Fähigkeit, Push-Benachrichtigungen", 4000, 9000),
          mod("Backend & API", "Benutzerverwaltung, Daten-API, Admin-Bereich", 1500, 4000),
          mod("Test", "Tests auf aktuellen Geräten, Beta über TestFlight/Play Console", 500, 1200),
          mod("Store-Veröffentlichung", "Store-Einträge, Screenshots, Einreichung", 300, 600),
        ],
        exclusions: it("Gebühren der App-Stores", "Inhalte und Übersetzungen", "Unterstützung älterer Betriebssystemversionen"),
        risks: lb(["Store-Prüfung", "Ablehnungen durch Apple/Google können die Veröffentlichung verzögern"]),
        openQuestions: it("Welche Funktionen braucht die erste Version?", "Login nötig? Zahlungen in der App?", "Gibt es bereits Entwicklerkonten?"),
        timeline: [
          { phase: "Konzept & Design", period: "Woche 1–3", result: "Klickprototyp" },
          { phase: "Entwicklung", period: "Woche 4–10", result: "Beta-Version" },
          { phase: "Test & Store", period: "Woche 11–12", result: "App veröffentlicht" },
        ],
      }),
  },
  {
    key: "wartung", label: "Wartung", hint: "Laufende Betreuung bestehender Systeme",
    build: () => preset(
      { title: "Wartung & Support", subtitle: "Laufende Betreuung von Website bzw. Anwendung",
        situationText: "Die bestehende Website bzw. Anwendung soll sicher, aktuell und erreichbar bleiben.",
        proposalText: "Wir übernehmen Updates, Sicherheit, Backups und Monitoring sowie kleine Anpassungen im Rahmen einer monatlichen Pauschale.",
        operationText: "Monatliche Wartungspauschale gemäß Angebot",
        costNote: "Einmalige Kosten für die Übernahme; die monatliche Pauschale wird im Angebot festgelegt. Alle Preise netto." },
      {
        modules: [mod("Übernahme & Bestandsaufnahme", "Zugänge, Sicherheitscheck, Backup-Einrichtung, Monitoring", 150, 400)],
        decisions: lb(["Leistungen", "Updates, Backups, Monitoring, Fehlerbehebung, kleine Inhaltsänderungen (Fair Use)"], ["Reaktionszeiten", "Nach Service Level Agreement"]),
        exclusions: it("Neue Funktionen und Redesigns", "Hosting- und Lizenzkosten, sofern nicht vereinbart"),
        openQuestions: it("Wo läuft das System heute (Hosting, Zugänge)?", "Welche Reaktionszeiten werden benötigt?"),
        timeline: [{ phase: "Übernahme", period: "Woche 1", result: "Wartung aktiv" }],
      }),
  },
  { key: "karaman", label: "Beispiel KARAMAN", hint: "Ausgefülltes Referenzbeispiel", build: karamanEstimate },
];
