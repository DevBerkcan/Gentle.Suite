# Mollie-Überarbeitung – API-Vertrag Backend ↔ Frontend

Gemeinsame Absprache für die Überarbeitung von Ratenzahlungen / Serienrechnungen (Branch `feature/mollie-monitoring`).
Backend implementiert, Frontend nutzt genau diese Formen. JSON in camelCase, Datumswerte ISO-8601.

## 1. Mandats-Einrichtung für Kunden (öffentlich, ohne Login)

Mails enthalten nur noch einen dauerhaften Link: `{FrontendBaseUrl}/payment/setup/{token}`.
Der Token gehört zu genau einem Abo (`CustomerSubscription`), ist zufällig (≥ 32 Zeichen, URL-sicher) und läuft nicht nach Minuten ab.

### `GET /api/public/mandate-setup/{token}`
200:
```json
{
  "status": "pending",            // pending | valid | processing | invalid
  "customerName": "Certi Development",
  "contactName": "Medin Turkes",  // kann null sein
  "creditorName": "Gentle Group", // unsere Firma (CompanySettings)
  "creditorId": "DE98ZZZ…",       // Gläubiger-ID, falls in Einstellungen vorhanden, sonst null
  "description": "Ratenzahlung (Systemtarif) – 12 Raten à 166,67 €",
  "amountText": "monatlich 166,67 €",
  "methods": { "iban": true, "card": true },
  "mandateText": "Ich ermächtige Gentle Group, Zahlungen von meinem Konto mittels Lastschrift einzuziehen …",
  "existingMandate": { "method": "directdebit", "accountLast4": "1234" },  // nur wenn status = valid, sonst null
  "nextCollectionDate": "2026-11-12T00:00:00+01:00", // gleiche Logik wie Abo-DTO §2; null = unbestimmt (z. B. Mandat fehlt noch)
  "nextCollectionAmount": 166.67                      // Bruttobetrag oder null
}
```
404, wenn der Token unbekannt ist.

### `POST /api/public/mandate-setup/{token}/iban`
Body: `{ "accountHolder": "Max Mustermann", "iban": "DE89 3704 0044 0532 0130 00", "confirm": true }`
200: `{ "status": "valid" }`. 400: `{ "error": "Deutscher Fehlertext" }` (IBAN ungültig, Bestätigung fehlt, Mollie lehnt ab …).

### `POST /api/public/mandate-setup/{token}/checkout`
Erzeugt eine frische Mollie-Erstzahlung (Karte) und liefert `{ "checkoutUrl": "https://www.mollie.com/checkout/…" }`.
`redirectUrl` der Zahlung: `{FrontendBaseUrl}/payment/setup/{token}?return=1`.

## 2. Abo-Daten (bestehendes `CustomerSubscription`-DTO, nur Felder ergänzt)

Neu in `GET /api/subscriptions`, `/subscriptions/customer/{id}`:
```json
{
  "nextCollectionDate": "2026-11-12T00:00:00+01:00",  // Tag des nächsten Einzugs (null = unbestimmt)
  "nextCollectionAmount": 166.67,                       // Bruttobetrag
  "nextCollectionInvoiceNumber": "RA-0002",             // null, wenn die Rechnung noch nicht erstellt ist (Prognose)
  "nextCollectionIsForecast": false,
  "nextCollectionBlockedReason": null,                  // z. B. "Mandat fehlt", "Freigabe fehlt", "Abo pausiert"
  "mandateMethod": "directdebit",                       // directdebit | creditcard | paypal | null
  "mandateAccountLast4": "3000",                        // IBAN- bzw. Kartenendziffern, null wenn unbekannt
  "mandateSetupUrl": "https://gentlesuite.vercel.app/payment/setup/abc…", // zum Kopieren für den Admin
  "invoicesPaid": 1, "invoicesTotal": 2, "paidAmount": 0.01, "outstandingAmount": 0.01,
  "lastSetupAttemptAt": "2026-10-30T14:12:05+00:00",   // letzter Einrichtungsversuch des Kunden über /payment/setup/{token}, null = nie
  "lastSetupAttemptMethod": "iban",                     // iban | card | null
  "lastSetupError": "Die IBAN ist ungültig. Bitte prüfen Sie Ihre Eingabe.", // null = letzter Versuch ok bzw. Mandat inzwischen gültig
  "setupAttemptCount": 2                                // Anzahl fehlgeschlagener Versuche, null = noch keiner
}
```

`lastSetupError` enthält den deutschen Kundentext, bei Ablehnung durch Mollie zusätzlich ` | Mollie: HTTP 422: …`
(Mollie-Detail, IBANs maskiert wie `DE89********3000`). Es wird nie eine vollständige IBAN gespeichert.
Gezählt wird: IBAN-POST mit Validierungsfehler (IBAN ungültig, Bestätigung/Name fehlt) oder Mollie-Ablehnung,
fehlgeschlagene Erzeugung des Karten-Checkouts und eine Karten-Erstzahlung, die per Webhook/Statusabfrage mit
`failed`/`expired`/`canceled` endet (Text z. B. „Kartenzahlung abgebrochen oder abgelaufen | Mollie: Status 'expired'“,
plus `details.failureReason`/`failureMessage`, falls vorhanden). Sobald ein Mandat gültig wird, wird `lastSetupError`
gelöscht; `lastSetupAttemptAt` bleibt erhalten.

`POST /api/invoices/{id}/collection-date` (Admin) – geplanten Einzug verschieben:
```json
{ "date": "2026-11-16", "reason": "Rechnung erst am 30.10. erhalten", "notifyCustomer": false }
```
Nur wenn die Rechnung zu einem Abo gehört, `paymentCollectionStatus = "scheduled"`, nicht bezahlt/storniert und noch keine
Mollie-Zahlung läuft. `date` muss zwischen morgen und heute + 90 Tagen liegen (Europe/Berlin). Setzt
`paymentCollectionDueDate` auf Berliner Mitternacht des Datums und `dueDate` mit, falls dieses früher lag. Antwort: die
aktualisierte Zeile wie in `GET /api/subscriptions/{id}/invoices`. 400 `{ "error": "…" }` bei Verstoß, 403 für Nicht-Admins.
`notifyCustomer: true` schickt eine kurze Mail an den Hauptkontakt („Neuer Einzugstermin für Rechnung …“); Standard ist
`false`, es wird nie automatisch informiert. Jede Verschiebung landet im Aktivitätsprotokoll des Kunden.

`GET /api/subscriptions/{id}/invoices` – Liste je Rechnung:
```json
{ "id": "…", "invoiceNumber": "RA-0002", "invoiceDate": "…", "status": "Sent", "grossTotal": 0.01,
  "billingPeriodStart": "…", "billingPeriodEnd": "…",
  "paymentCollectionDueDate": "…", "paymentCollectionStatus": "scheduled",
  "collectionAttemptCount": 0, "paidAt": null, "chargedBack": false, "lastFailureReason": null }
```

## 3. Monitoring (Login nötig)

### `GET /api/monitoring/payments`
```json
{
  "lastBillingRun": { "startedAt": "…", "finishedAt": "…", "succeeded": true, "invoicesCreated": 2,
                      "collectionsStarted": 1, "failures": 0, "error": null },
  "lastMandateReconcile": { "startedAt": "…", "finishedAt": "…", "succeeded": true, "updated": 1, "error": null },
  "issues": [
    { "severity": "critical", "kind": "billing-job-stale", "title": "Abrechnungslauf seit 30 h nicht gelaufen",
      "detail": "…", "customerName": null, "subscriptionId": null, "invoiceId": null, "since": "…" }
  ],
  "counts": { "critical": 1, "warning": 3, "info": 0 }
}
```
`kind`-Werte: `billing-job-stale`, `billing-job-failed`, `collection-overdue` (scheduled, Fälligkeit vorbei),
`collection-stuck` (open/pending > 5 Werktage), `collection-failed`, `chargeback`, `mandate-missing` (> 3 Tage),
`mandate-email-failed`, `mandate-setup-failed` (letzter Einrichtungsversuch des Kunden in den letzten 14 Tagen
fehlgeschlagen, Mandat weiterhin nicht gültig; Titel „Einrichtung fehlgeschlagen: <Plan>“, Detail = Fehler),
`authorization-missing`, `webhook-errors`, `mail-delivery-failed`.

### `POST /api/monitoring/reconcile-mandates` (Admin)
Startet den Mandats-Abgleich sofort, Antwort wie `lastMandateReconcile`.

### `POST /api/subscriptions/{id}/mandate/check` (Admin)
Gleicht ein einzelnes Abo mit Mollie ab und liefert das aktualisierte Abo-DTO.
