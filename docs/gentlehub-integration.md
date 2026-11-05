# GentleHub → Gentlesuite: Kunden und Kontakte anlegen

Diese Schnittstelle erlaubt GentleHub, aus einer Anfrage (Outlook → GentleHub → Telegram) per Knopfdruck einen
Kunden mit Kontakt in Gentlesuite anzulegen – ohne Login und ohne dass jemand in Gentlesuite klicken muss.

## Zugang

| | |
|---|---|
| Basis-URL | `https://gentlesuite.runasp.net/api/integrations/hub/v1` |
| Authentifizierung | Header `X-Api-Key: gsk_…` |
| Schlüssel erzeugen | Gentlesuite → Organisation → Verwaltung → **Schnittstellen** (nur Admins). Der Schlüssel wird nur einmal angezeigt. |
| Format | JSON, UTF-8 |
| Limit | 120 Anfragen pro Minute und Schlüssel |

Den Schlüssel in GentleHub als Secret/Umgebungsvariable speichern (z. B. `GENTLESUITE_API_KEY`), nie im Code
oder in Telegram-Nachrichten. Ein kompromittierter Schlüssel wird in Gentlesuite widerrufen und durch einen neuen ersetzt.

## Empfohlener Ablauf in GentleHub

1. Neue Anfrage aus Outlook ist ausgewertet (Name, Firma, E-Mail, Telefon, Anliegen).
2. `GET /customers/lookup?email=…` – ist die Person schon bekannt?
   - Treffer → in Telegram „Bereits Kunde: {companyName} ({customerNumber})“ mit Link `crmUrl` anzeigen.
   - Kein Treffer → Button „Kunde anlegen“ anbieten.
3. Klick auf „Kunde anlegen“ → `POST /customers` mit `externalId` = ID der Anfrage in GentleHub.
4. Antwort in Telegram bestätigen: „Angelegt: {companyName} ({customerNumber})“ + Link `crmUrl`.

`POST /customers` ist auch ohne vorherigen Lookup sicher: Bekannte Personen werden nicht doppelt angelegt.

## Endpunkte

### `GET /ping` – Verbindungstest
```json
{ "ok": true, "key": "GentleHub", "time": "2026-11-03T10:00:00+00:00" }
```

### `GET /customers/lookup?email=&phone=&companyName=`
Mindestens ein Parameter. Liefert eine Liste von Treffern (leer = unbekannt):
```json
[{
  "customerId": "6f1c…", "customerNumber": "KD-2026-00042", "companyName": "Bäckerei Muster GmbH",
  "contactName": "Anna Muster", "email": "anna@baeckerei-muster.de", "phone": "0211 123456",
  "matchedBy": "Email", "crmUrl": "https://gentlesuite.vercel.app/customers/6f1c…"
}]
```
`matchedBy`: `Email`, `Phone` oder `CompanyName`.

### `POST /customers` – Kunde mit Kontakt anlegen
```json
{
  "companyName": "Bäckerei Muster GmbH",
  "firstName": "Anna",
  "lastName": "Muster",
  "email": "anna@baeckerei-muster.de",
  "phone": "0211 123456",
  "position": "Geschäftsführerin",
  "website": "https://baeckerei-muster.de",
  "street": "Hauptstr. 1", "zipCode": "40210", "city": "Düsseldorf", "country": "Deutschland",
  "industry": "Lebensmittel",
  "sourceNote": "Outlook-Anfrage vom 03.11.2026: Website-Relaunch mit Onlineshop",
  "externalId": "hub-inquiry-8f2a91",
  "inquirySubject": "Website-Relaunch mit Onlineshop",
  "createOpportunity": true
}
```
Pflicht: `firstName`, `email`. Ohne `companyName` (Privatperson) wird „Vorname Nachname“ als Kundenname verwendet.
Alles andere ist optional.

**Pipeline:** Standardmäßig (`createOpportunity` fehlt oder `true`) landet jede Anfrage zusätzlich als Opportunity in
Phase „Qualifizierung“ (Quelle Inbound, Abschluss in 30 Tagen, Titel = `inquirySubject`, sonst `sourceNote`).
Mit `externalId` ist das idempotent: dieselbe Anfrage erzeugt nie eine zweite Opportunity. Ist die Person schon
bekannt (`outcome: existing`), wird nur mit `externalId` eine Opportunity angelegt – ohne ID wären Wiederholungen Dubletten.

Antwort (`201` bei Neuanlage, sonst `200`):
```json
{
  "outcome": "created",
  "customerId": "6f1c…", "customerNumber": "KD-2026-00042", "companyName": "Bäckerei Muster GmbH",
  "contactId": "a3d9…", "matchedBy": null,
  "crmUrl": "https://gentlesuite.vercel.app/customers/6f1c…",
  "opportunityId": "c71e…"
}
```

| `outcome` | Bedeutung |
|---|---|
| `created` | Neuer Kunde (Status „Lead“, Datenherkunft „Inbound“ + `sourceNote`) mit der Person als Hauptkontakt. |
| `existing` | Person ist schon bekannt (gleiche E-Mail/Telefonnummer oder gleiche `externalId`). Es wurde nichts geändert. |
| `contact-added` | Firma war bekannt, die Person nicht → als weiterer Kontakt hinzugefügt. |

Es wird **keine Willkommens-Mail** an den Kontakt verschickt.

### `POST /customers/{customerId}/contacts` – Kontakt hinzufügen
```json
{ "firstName": "Ben", "lastName": "Muster", "email": "ben@baeckerei-muster.de", "phone": null, "position": "Einkauf", "isPrimary": false }
```
Antwort: `{ "outcome": "created" | "existing", "customerId": "…", "contactId": "…", "crmUrl": "…" }`

## Lese-Schnittstelle für GentleHubs Agenten

Derselbe Schlüssel gilt auch für die rein lesende Schnittstelle, die GentleHubs bestehender `GentleSuiteClient`
nutzt (Basis `https://gentlesuite.runasp.net/api/integrations/gentlehub`, Header `X-GentleHub-Api-Key` oder `X-Api-Key`):

| Endpunkt | Zweck |
|---|---|
| `GET /ping` | Verbindungstest (`scope: "read"`) |
| `GET /customers/lookup?email=` | Kunde zur Absender-Adresse: exakter Kontakt (`contact_email`), sonst Firmen-Domain (`domain`, nie bei Freemail) |
| `GET /customers/search?q=` | Suche nach Firmenname oder Kundennummer |
| `GET /customers/{id}/context` | Kontakte, Projekte, Angebote (Kopfdaten), Verkaufschancen eines Kunden |

In GentleHub reicht dafür die Konfiguration `GentleSuite:ApiUrl` (`https://gentlesuite.runasp.net`) und
`GentleSuite:ApiKey` (der Schlüssel aus „Schnittstellen“). Ein serverseitiger Schlüssel in Gentlesuites
appsettings ist nicht nötig.

## Fehler

| Status | Bedeutung |
|---|---|
| 400 | Ungültige Eingabe (z. B. fehlende/ungültige E-Mail) – Details im JSON (`errors` bzw. `error`). |
| 401 | Schlüssel fehlt, ist falsch oder widerrufen. |
| 404 | Kunde nicht gefunden (Kontakt hinzufügen). |
| 429 | Zu viele Anfragen – kurz warten und erneut versuchen. |

Wiederholungen nach Netzwerkfehlern sind unkritisch, solange dieselbe `externalId` mitgeschickt wird.

## Beispiele

### curl
```bash
curl -s https://gentlesuite.runasp.net/api/integrations/hub/v1/customers \
  -H "X-Api-Key: $GENTLESUITE_API_KEY" -H "Content-Type: application/json" \
  -d '{"companyName":"Bäckerei Muster GmbH","firstName":"Anna","lastName":"Muster","email":"anna@baeckerei-muster.de","sourceNote":"Outlook-Anfrage: Website-Relaunch","externalId":"hub-inquiry-8f2a91"}'
```

### TypeScript (Node 18+)
```ts
const BASE = "https://gentlesuite.runasp.net/api/integrations/hub/v1";
const headers = { "X-Api-Key": process.env.GENTLESUITE_API_KEY!, "Content-Type": "application/json" };

export async function findInGentlesuite(email: string) {
  const r = await fetch(`${BASE}/customers/lookup?email=${encodeURIComponent(email)}`, { headers });
  if (!r.ok) throw new Error(`Gentlesuite lookup ${r.status}: ${await r.text()}`);
  return (await r.json()) as Array<{ customerId: string; customerNumber: string | null; companyName: string; crmUrl: string; matchedBy: string }>;
}

export async function createInGentlesuite(inquiry: {
  id: string; company?: string; firstName: string; lastName?: string; email: string; phone?: string; summary: string; receivedAt: Date;
}) {
  const r = await fetch(`${BASE}/customers`, {
    method: "POST", headers,
    body: JSON.stringify({
      companyName: inquiry.company, firstName: inquiry.firstName, lastName: inquiry.lastName,
      email: inquiry.email, phone: inquiry.phone, externalId: inquiry.id,
      sourceNote: `Outlook-Anfrage vom ${inquiry.receivedAt.toLocaleDateString("de-DE")}: ${inquiry.summary}`.slice(0, 1000),
    }),
  });
  if (!r.ok) throw new Error(`Gentlesuite create ${r.status}: ${await r.text()}`);
  return (await r.json()) as { outcome: "created" | "existing" | "contact-added"; customerNumber: string | null; companyName: string; crmUrl: string };
}
```

## Datenschutz

Angelegt werden nur die Angaben, die die Person selbst in ihrer Anfrage gemacht hat (Art. 6 Abs. 1 lit. b DSGVO,
vorvertragliche Maßnahmen). Die Herkunft steht im Kunden unter „Datenherkunft“ (`Inbound` + `sourceNote`).
Keine Inhalte der E-Mail über die Zusammenfassung hinaus übertragen.
