/* Generator für Website-Rechtstexte der Kunden (Impressum, Datenschutzerklärung, Barrierefreiheitserklärung).
   Eigene Formulierungen der Gentle Group. Die Texte sind Generator-Ergebnisse auf Basis der Kundenangaben —
   laut Agenturvertrag prüft der Kunde sie selbst; eine Rechtsberatung ist damit nicht verbunden. */

export type LegalForm = "Einzelunternehmen" | "e.K." | "GbR" | "GmbH" | "UG (haftungsbeschränkt)" | "AG" | "Freiberufler" | "Verein" | "Sonstige";

export interface WebsiteLegalConfig {
  provider: {
    name: string; legalForm: LegalForm; representative: string;
    street: string; zip: string; city: string; country: string;
    phone: string; email: string; website: string;
    vatId: string; wirtschaftsId: string; registerCourt: string; registerNumber: string;
    supervisoryAuthority: string; chamber: string; professionTitle: string; professionCountry: string; professionRules: string;
    liabilityInsurance: string; contentResponsible: string;
  };
  privacy: {
    state: string; dpo: string;
    hostingName: string; hostingAddress: string; hostingOutsideEu: boolean;
    contactForm: boolean; emailPhone: boolean; consentTool: string;
    ga4: boolean; matomo: boolean; clarity: boolean;
    maps: boolean; youtube: boolean; localFonts: boolean;
    newsletterProvider: string; bookingProvider: string; socialLinks: boolean; applications: boolean;
    paymentProviders: string; extra: string;
  };
  a11y: { service: string; status: "full" | "partial"; limitations: string; measures: string; date: string; contactEmail: string; contactPhone: string };
}

export type Block = { h?: string; h3?: string; p?: string; list?: string[] };
export type LegalDoc = { title: string; blocks: Block[] };

export const STATES: Record<string, string> = {
  BW: "Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg",
  BY: "Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)",
  BE: "Berliner Beauftragte für Datenschutz und Informationsfreiheit",
  BB: "Landesbeauftragte für den Datenschutz und für das Recht auf Akteneinsicht Brandenburg",
  HB: "Landesbeauftragte für Datenschutz und Informationsfreiheit der Freien Hansestadt Bremen",
  HH: "Hamburgischer Beauftragter für Datenschutz und Informationsfreiheit",
  HE: "Hessischer Beauftragter für Datenschutz und Informationsfreiheit",
  MV: "Landesbeauftragter für Datenschutz und Informationsfreiheit Mecklenburg-Vorpommern",
  NI: "Landesbeauftragte für den Datenschutz Niedersachsen",
  NW: "Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen",
  RP: "Landesbeauftragter für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz",
  SL: "Unabhängiges Datenschutzzentrum Saarland",
  SN: "Sächsische Datenschutz- und Transparenzbeauftragte",
  ST: "Landesbeauftragter für den Datenschutz Sachsen-Anhalt",
  SH: "Unabhängiges Landeszentrum für Datenschutz Schleswig-Holstein",
  TH: "Thüringer Landesbeauftragter für den Datenschutz und die Informationsfreiheit",
};

export const LEGAL_FORMS: LegalForm[] = ["Einzelunternehmen", "e.K.", "GbR", "GmbH", "UG (haftungsbeschränkt)", "AG", "Freiberufler", "Verein", "Sonstige"];

export function emptyConfig(): WebsiteLegalConfig {
  return {
    provider: { name: "", legalForm: "Einzelunternehmen", representative: "", street: "", zip: "", city: "", country: "Deutschland", phone: "", email: "", website: "",
      vatId: "", wirtschaftsId: "", registerCourt: "", registerNumber: "", supervisoryAuthority: "", chamber: "", professionTitle: "", professionCountry: "Deutschland", professionRules: "", liabilityInsurance: "", contentResponsible: "" },
    privacy: { state: "NW", dpo: "", hostingName: "", hostingAddress: "", hostingOutsideEu: false, contactForm: true, emailPhone: true, consentTool: "",
      ga4: false, matomo: false, clarity: false, maps: false, youtube: false, localFonts: true, newsletterProvider: "", bookingProvider: "", socialLinks: true, applications: false, paymentProviders: "", extra: "" },
    a11y: { service: "", status: "partial", limitations: "", measures: "", date: new Date().toISOString().slice(0, 10), contactEmail: "", contactPhone: "" },
  };
}

/** Merges a stored (possibly older/partial) config over the defaults so new fields always exist. */
export function withDefaults(c?: Partial<WebsiteLegalConfig> | null): WebsiteLegalConfig {
  const d = emptyConfig();
  return { provider: { ...d.provider, ...(c?.provider ?? {}) }, privacy: { ...d.privacy, ...(c?.privacy ?? {}) }, a11y: { ...d.a11y, ...(c?.a11y ?? {}) } };
}

const has = (s?: string) => !!s && s.trim().length > 0;
const de = (iso: string) => (iso ? new Date(iso + "T12:00:00").toLocaleDateString("de-DE") : "");
const isCompany = (f: LegalForm) => ["GmbH", "UG (haftungsbeschränkt)", "AG", "e.K.", "Verein"].includes(f);

/** Required value or a visible "[…]" placeholder, so missing mandatory data shows up under "Noch offen". */
const req = (v: string, placeholder: string) => (has(v) ? v.trim() : `[${placeholder}]`);

function addressLines(p: WebsiteLegalConfig["provider"]): string {
  const base = req(p.name, "Firma / Name");
  const name = p.legalForm === "Einzelunternehmen" || p.legalForm === "Freiberufler" || p.legalForm === "Sonstige" || base.includes(p.legalForm) ? base : `${base} ${p.legalForm}`;
  return [name, req(p.street, "Straße und Hausnummer"), `${req(p.zip, "PLZ")} ${req(p.city, "Ort")}`, p.country && p.country !== "Deutschland" ? p.country : ""].filter(has).join("\n");
}

// ---------------------------------------------------------------- Impressum

export function impressum(c: WebsiteLegalConfig): LegalDoc {
  const p = c.provider;
  const b: Block[] = [];
  b.push({ h: "Angaben gemäß § 5 DDG", p: addressLines(p) });
  b.push({ h3: isCompany(p.legalForm) || p.legalForm === "GbR" ? "Vertreten durch" : "Inhaber", p: req(p.representative, isCompany(p.legalForm) ? "Geschäftsführer / Vorstand" : "Vor- und Nachname des Inhabers") });
  b.push({ h3: "Kontakt", p: [has(p.phone) ? `Telefon: ${p.phone}` : "", `E-Mail: ${req(p.email, "E-Mail-Adresse")}`].filter(has).join("\n") });
  if (["GmbH", "UG (haftungsbeschränkt)", "AG", "e.K."].includes(p.legalForm) && !has(p.registerNumber))
    b.push({ h3: "Registereintrag", p: "[Registergericht und Registernummer]" });
  if (has(p.registerCourt) || has(p.registerNumber)) b.push({ h3: "Registereintrag", p: [has(p.registerCourt) ? `Registergericht: ${p.registerCourt}` : "", has(p.registerNumber) ? `Registernummer: ${p.registerNumber}` : ""].filter(has).join("\n") });
  if (has(p.vatId) || has(p.wirtschaftsId)) b.push({ h3: "Umsatzsteuer und Wirtschafts-ID", p: [has(p.vatId) ? `Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ${p.vatId}` : "", has(p.wirtschaftsId) ? `Wirtschafts-Identifikationsnummer gemäß § 139c AO: ${p.wirtschaftsId}` : ""].filter(has).join("\n") });
  if (has(p.supervisoryAuthority)) b.push({ h3: "Zuständige Aufsichtsbehörde", p: p.supervisoryAuthority });
  if (has(p.professionTitle) || has(p.chamber)) b.push({ h3: "Berufsrechtliche Angaben", p: [
    has(p.professionTitle) ? `Gesetzliche Berufsbezeichnung: ${p.professionTitle} (verliehen in ${p.professionCountry || "Deutschland"})` : "",
    has(p.chamber) ? `Zuständige Kammer: ${p.chamber}` : "",
    has(p.professionRules) ? `Es gelten folgende berufsrechtliche Regelungen: ${p.professionRules}` : "",
  ].filter(has).join("\n") });
  if (has(p.liabilityInsurance)) b.push({ h3: "Berufshaftpflichtversicherung", p: p.liabilityInsurance });
  if (has(p.contentResponsible)) b.push({ h3: "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV", p: p.contentResponsible });
  b.push({ h3: "Verbraucherstreitbeilegung", p: "Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen." });
  return { title: "Impressum", blocks: b };
}

// ---------------------------------------------------------------- Datenschutzerklärung

export function datenschutz(c: WebsiteLegalConfig): LegalDoc {
  const p = c.provider, d = c.privacy;
  const b: Block[] = [];
  let n = 0;
  const h = (t: string) => b.push({ h: `${++n}. ${t}` });

  h("Verantwortlicher");
  b.push({ p: `Verantwortlich für die Datenverarbeitung auf dieser Website im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:\n\n${addressLines(p)}${has(p.representative) ? `\nVertreten durch: ${p.representative}` : ""}\n${[has(p.phone) ? `Telefon: ${p.phone}` : "", has(p.email) ? `E-Mail: ${p.email}` : ""].filter(has).join("\n")}` });
  if (has(d.dpo)) b.push({ h3: "Datenschutzbeauftragter", p: d.dpo });

  h("Überblick über die Verarbeitung");
  b.push({ p: "Wir verarbeiten personenbezogene Daten nur, soweit dies für den Betrieb dieser Website, die Bereitstellung unserer Inhalte und Leistungen oder die Beantwortung Ihrer Anfragen erforderlich ist oder Sie eingewilligt haben." });
  b.push({ p: "Rechtsgrundlagen sind insbesondere:", list: [
    "Art. 6 Abs. 1 lit. a DSGVO – Ihre Einwilligung",
    "Art. 6 Abs. 1 lit. b DSGVO – Vertragserfüllung und vorvertragliche Maßnahmen",
    "Art. 6 Abs. 1 lit. c DSGVO – rechtliche Verpflichtungen, z. B. Aufbewahrungspflichten",
    "Art. 6 Abs. 1 lit. f DSGVO – unsere berechtigten Interessen, z. B. ein sicherer und stabiler Betrieb der Website",
  ] });
  b.push({ p: "Speichern oder lesen wir Informationen auf Ihrem Endgerät (z. B. Cookies), geschieht dies nur, wenn es für den von Ihnen gewünschten Dienst unbedingt erforderlich ist, oder mit Ihrer Einwilligung (§ 25 TDDDG)." });
  b.push({ p: "Wir löschen personenbezogene Daten, sobald der Zweck der Verarbeitung entfällt und keine gesetzlichen Aufbewahrungsfristen (z. B. nach Handels- und Steuerrecht bis zu zehn Jahre) entgegenstehen." });

  h("Hosting und Server-Logfiles");
  b.push({ p: `Diese Website wird bei ${has(d.hostingName) ? d.hostingName : "[Hosting-Anbieter]"}${has(d.hostingAddress) ? `, ${d.hostingAddress}` : ""} gehostet. Mit dem Anbieter besteht ein Vertrag über die Auftragsverarbeitung nach Art. 28 DSGVO.${d.hostingOutsideEu ? " Dabei kann eine Übermittlung in Drittländer außerhalb der EU erfolgen; sie stützt sich auf einen Angemessenheitsbeschluss der EU-Kommission (z. B. EU-US Data Privacy Framework) oder auf Standardvertragsklauseln." : ""}` });
  b.push({ p: "Beim Aufruf der Website werden automatisch Informationen erfasst, die Ihr Browser übermittelt (Server-Logfiles):", list: ["IP-Adresse", "Datum und Uhrzeit des Zugriffs", "aufgerufene Seite und übertragene Datenmenge", "Referrer-URL (zuvor besuchte Seite)", "Browsertyp, Betriebssystem"] });
  b.push({ p: "Die Verarbeitung ist für die Auslieferung der Website und die Abwehr von Angriffen erforderlich (Art. 6 Abs. 1 lit. f DSGVO). Die Logfiles werden spätestens nach 14 Tagen gelöscht, sofern sie nicht zur Aufklärung eines Sicherheitsvorfalls benötigt werden." });

  h("Verschlüsselung");
  b.push({ p: "Diese Website nutzt aus Sicherheitsgründen eine TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie an „https://“ und dem Schloss-Symbol in der Adresszeile Ihres Browsers." });

  if (has(d.consentTool) || d.ga4 || d.matomo || d.clarity || d.maps || d.youtube) {
    h("Cookies und Einwilligungsverwaltung");
    b.push({ p: `Für Dienste, die nicht unbedingt erforderlich sind, holen wir vorher Ihre Einwilligung ein${has(d.consentTool) ? ` und verwenden dafür ${d.consentTool}. Das Tool speichert Ihre Auswahl, damit wir sie bei weiteren Besuchen berücksichtigen können (Art. 6 Abs. 1 lit. c DSGVO i. V. m. Art. 7 Abs. 1 DSGVO)` : ""}. Sie können Ihre Einwilligung jederzeit über die Cookie-Einstellungen auf dieser Website mit Wirkung für die Zukunft widerrufen oder ändern.` });
  }

  if (d.contactForm || d.emailPhone) {
    h("Kontaktaufnahme");
    b.push({ p: `${d.contactForm ? "Wenn Sie uns über das Kontaktformular" : "Wenn Sie uns"}${d.contactForm && d.emailPhone ? ", per E-Mail oder telefonisch" : d.emailPhone ? " per E-Mail oder telefonisch" : ""} kontaktieren, verarbeiten wir Ihre Angaben (z. B. Name, Kontaktdaten, Nachricht), um Ihre Anfrage zu bearbeiten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, wenn Ihre Anfrage mit einem Vertrag zusammenhängt, sonst unser berechtigtes Interesse an der Beantwortung (Art. 6 Abs. 1 lit. f DSGVO). Wir löschen die Daten, sobald die Anfrage abschließend bearbeitet ist und keine Aufbewahrungspflichten bestehen.` });
  }

  if (d.ga4 || d.matomo || d.clarity) {
    h("Webanalyse");
    if (d.ga4) b.push({ h3: "Google Analytics 4", p: "Mit Ihrer Einwilligung nutzen wir Google Analytics 4 der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland, um die Nutzung unserer Website statistisch auszuwerten. Dabei werden Cookies gesetzt und Nutzungsdaten (z. B. aufgerufene Seiten, Verweildauer, Geräteinformationen, gekürzte IP-Adresse) verarbeitet. Eine Übermittlung an Google LLC in den USA ist möglich; sie erfolgt auf Grundlage des EU-US Data Privacy Framework. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG)." });
    if (d.matomo) b.push({ h3: "Matomo", p: "Mit Ihrer Einwilligung nutzen wir die Analysesoftware Matomo. Matomo läuft auf unserem eigenen Server bzw. dem unseres Hosting-Anbieters; die Daten werden nicht an Dritte weitergegeben. IP-Adressen werden vor der Speicherung gekürzt. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG)." });
    if (d.clarity) b.push({ h3: "Microsoft Clarity", p: "Mit Ihrer Einwilligung nutzen wir Microsoft Clarity der Microsoft Ireland Operations Limited, One Microsoft Place, South County Business Park, Leopardstown, Dublin 18, Irland. Clarity wertet aus, wie Besucher die Website nutzen (z. B. Klicks, Scrollverhalten, Sitzungsaufzeichnungen ohne Eingaben in Formularfeldern), damit wir sie verbessern können. Eine Übermittlung in die USA ist möglich; sie erfolgt auf Grundlage des EU-US Data Privacy Framework. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG)." });
  }

  if (d.maps || d.youtube) {
    h("Eingebundene Inhalte");
    if (d.maps) b.push({ h3: "Google Maps", p: "Zur Darstellung unseres Standorts binden wir Karten von Google Maps (Google Ireland Limited) ein. Die Karte wird erst geladen, wenn Sie eingewilligt haben; dabei wird Ihre IP-Adresse an Google übermittelt, ggf. auch in die USA (EU-US Data Privacy Framework). Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)." });
    if (d.youtube) b.push({ h3: "YouTube", p: "Wir binden Videos von YouTube (Google Ireland Limited) im erweiterten Datenschutzmodus ein. Ein Video wird erst geladen, wenn Sie eingewilligt haben; ab dann werden Daten wie Ihre IP-Adresse an YouTube übermittelt, ggf. auch in die USA (EU-US Data Privacy Framework). Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)." });
  }

  if (d.localFonts) {
    h("Schriftarten");
    b.push({ p: "Die auf dieser Website verwendeten Schriftarten sind lokal auf unserem Server eingebunden. Beim Aufruf der Website wird keine Verbindung zu Servern Dritter (z. B. Google Fonts) hergestellt." });
  }

  if (has(d.newsletterProvider)) {
    h("Newsletter");
    b.push({ p: `Wenn Sie unseren Newsletter abonnieren, verarbeiten wir Ihre E-Mail-Adresse und ggf. Ihren Namen, um Ihnen den Newsletter zu senden. Die Anmeldung erfolgt im Double-Opt-in-Verfahren: Sie erhalten eine E-Mail, in der Sie die Anmeldung bestätigen. Für den Versand nutzen wir ${d.newsletterProvider} als Auftragsverarbeiter. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Sie können den Newsletter jederzeit über den Abmeldelink in jeder Ausgabe abbestellen.` });
  }

  if (has(d.bookingProvider)) {
    h("Online-Terminbuchung");
    b.push({ p: `Für die Online-Terminbuchung nutzen wir ${d.bookingProvider}. Dabei verarbeiten wir die Angaben, die Sie bei der Buchung machen (z. B. Name, Kontaktdaten, gewünschter Termin), um den Termin zu vereinbaren und durchzuführen (Art. 6 Abs. 1 lit. b DSGVO). Der Anbieter ist als Auftragsverarbeiter für uns tätig.` });
  }

  if (has(d.paymentProviders)) {
    h("Zahlungsdienstleister");
    b.push({ p: `Für die Abwicklung von Zahlungen nutzen wir ${d.paymentProviders}. Dabei werden die für die Zahlung erforderlichen Daten (z. B. Name, Betrag, Zahlungsdaten) an den jeweiligen Anbieter übermittelt (Art. 6 Abs. 1 lit. b DSGVO). Für die Verarbeitung gelten zusätzlich die Datenschutzhinweise des jeweiligen Anbieters.` });
  }

  if (d.applications) {
    h("Bewerbungen");
    b.push({ p: "Wenn Sie sich bei uns bewerben, verarbeiten wir Ihre Bewerbungsunterlagen zur Durchführung des Bewerbungsverfahrens (Art. 6 Abs. 1 lit. b DSGVO). Kommt kein Arbeitsverhältnis zustande, löschen wir Ihre Daten spätestens sechs Monate nach Abschluss des Verfahrens, sofern Sie nicht in eine längere Speicherung eingewilligt haben." });
  }

  if (d.socialLinks) {
    h("Links zu sozialen Netzwerken");
    b.push({ p: "Auf dieser Website verlinken wir auf unsere Profile in sozialen Netzwerken. Es handelt sich um einfache Links; beim Aufruf unserer Website werden keine Daten an die Netzwerke übertragen. Erst wenn Sie einen Link anklicken, gelten die Datenschutzbestimmungen des jeweiligen Netzwerks." });
  }

  if (has(d.extra)) { h("Weitere Verarbeitungen"); b.push({ p: d.extra }); }

  h("Ihre Rechte");
  b.push({ p: "Sie haben nach der DSGVO folgende Rechte:", list: [
    "Auskunft über Ihre bei uns gespeicherten Daten (Art. 15 DSGVO)",
    "Berichtigung unrichtiger Daten (Art. 16 DSGVO)",
    "Löschung (Art. 17 DSGVO) und Einschränkung der Verarbeitung (Art. 18 DSGVO)",
    "Datenübertragbarkeit (Art. 20 DSGVO)",
    "Widerruf einer erteilten Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)",
  ] });
  b.push({ h3: "Widerspruchsrecht (Art. 21 DSGVO)", p: "Verarbeiten wir Ihre Daten auf Grundlage unserer berechtigten Interessen (Art. 6 Abs. 1 lit. f DSGVO), können Sie aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit widersprechen. Der Verarbeitung zu Zwecken der Direktwerbung können Sie jederzeit ohne Angabe von Gründen widersprechen." });
  b.push({ h3: "Beschwerderecht", p: `Sie können sich bei einer Datenschutz-Aufsichtsbehörde beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer Daten gegen die DSGVO verstößt (Art. 77 DSGVO). Für uns zuständig ist: ${STATES[d.state] ?? "[zuständige Aufsichtsbehörde]"}.` });
  b.push({ p: `Stand: ${new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })}` });
  return { title: "Datenschutzerklärung", blocks: b };
}

// ---------------------------------------------------------------- Barrierefreiheitserklärung

export function barrierefreiheit(c: WebsiteLegalConfig): LegalDoc {
  const p = c.provider, a = c.a11y;
  const b: Block[] = [];
  b.push({ p: `Diese Erklärung gilt für ${has(a.service) ? a.service : "die auf dieser Website angebotene Dienstleistung"} von ${p.name || "[Unternehmen]"}. Sie wird nach dem Barrierefreiheitsstärkungsgesetz (BFSG) bereitgestellt.` });
  b.push({ h: "Stand der Vereinbarkeit", p: a.status === "full"
    ? "Die Website erfüllt die Anforderungen an die Barrierefreiheit nach dem BFSG und der Verordnung zum BFSG (BFSGV). Grundlage ist die europäische Norm EN 301 549 bzw. die Web Content Accessibility Guidelines (WCAG) 2.1 auf Stufe AA."
    : "Die Website erfüllt die Anforderungen an die Barrierefreiheit nach dem BFSG und der BFSGV teilweise. Grundlage ist die europäische Norm EN 301 549 bzw. die Web Content Accessibility Guidelines (WCAG) 2.1 auf Stufe AA. Die nachstehend genannten Inhalte sind noch nicht vollständig barrierefrei." });
  if (has(a.measures)) b.push({ h: "So erfüllen wir die Anforderungen", p: a.measures });
  if (a.status === "partial") b.push({ h: "Nicht barrierefreie Inhalte", p: has(a.limitations) ? a.limitations : "[bitte bekannte Einschränkungen und geplante Verbesserungen angeben]" });
  b.push({ h: "Erstellung dieser Erklärung", p: `Diese Erklärung wurde am ${de(a.date)} auf Grundlage einer Selbstbewertung erstellt.` });
  b.push({ h: "Feedback und Kontakt", p: `Sind Ihnen Barrieren auf dieser Website aufgefallen? Dann teilen Sie uns dies bitte mit:\n${[has(a.contactEmail || p.email) ? `E-Mail: ${a.contactEmail || p.email}` : "", has(a.contactPhone || p.phone) ? `Telefon: ${a.contactPhone || p.phone}` : ""].filter(has).join("\n")}` });
  b.push({ h: "Marktüberwachungsbehörde", p: "Wenn Sie der Ansicht sind, dass die Anforderungen an die Barrierefreiheit nicht erfüllt werden, können Sie sich an die zuständige Marktüberwachungsbehörde wenden: Marktüberwachungsstelle der Länder für die Barrierefreiheit von Produkten und Dienstleistungen (MLBF), Magdeburg." });
  return { title: "Erklärung zur Barrierefreiheit", blocks: b };
}

// ---------------------------------------------------------------- Ausgabe

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const para = (s: string) => esc(s).split(/\n\n/).map((x) => `<p>${x.replace(/\n/g, "<br>")}</p>`).join("\n");

export function toHtml(doc: LegalDoc): string {
  const out = [`<h1>${esc(doc.title)}</h1>`];
  for (const b of doc.blocks) {
    if (b.h) out.push(`<h2>${esc(b.h)}</h2>`);
    if (b.h3) out.push(`<h3>${esc(b.h3)}</h3>`);
    if (b.p) out.push(para(b.p));
    if (b.list) out.push(`<ul>\n${b.list.map((l) => `  <li>${esc(l)}</li>`).join("\n")}\n</ul>`);
  }
  return out.join("\n");
}

export function toText(doc: LegalDoc): string {
  const out = [doc.title.toUpperCase(), ""];
  for (const b of doc.blocks) {
    if (b.h) out.push("", b.h);
    if (b.h3) out.push("", b.h3);
    if (b.p) out.push(b.p);
    if (b.list) out.push(...b.list.map((l) => `• ${l}`));
  }
  return out.join("\n").trim();
}

/** Placeholders like "[Hosting-Anbieter]" that must be filled before publishing. */
export const openPlaceholders = (doc: LegalDoc) => toText(doc).match(/\[[^\]]+\]/g) ?? [];
