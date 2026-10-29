# Angebot vom Agent übernehmen

Mit „Vom Agent übernehmen“ auf der Angebotsdetailseite lässt sich ein Angebot aus einem Briefing oder einer Aufwandsschätzung von Claude/ChatGPT vorbereiten und mit einem Klick ins CRM übernehmen.

## Ablauf

1. Angebot anlegen (Kunde wählen) und öffnen. Der Button erscheint nur bei Entwürfen der aktuellen Version, solange Positionen und Details nicht gerade bearbeitet werden.
2. **Vom Agent übernehmen** → **Prompt kopieren**.
3. Prompt in Claude/ChatGPT einfügen, Briefing/Schätzung darunter ergänzen, absenden. (Alternativ den Prompt unten als Projekt-Anweisung in einem Claude-/ChatGPT-Projekt hinterlegen – dann reicht das Briefing.)
4. Die JSON-Antwort komplett in das Textfeld einfügen. ```json-Fences und Text vor/nach dem JSON werden automatisch entfernt.
5. Vorschau prüfen (Betreff, Anzahl Positionen, Netto-Summen), **Positionen ersetzen** oder **Positionen anhängen** wählen, **Übernehmen**.

## Was übernommen wird

| JSON-Feld | Ziel im Angebot |
|---|---|
| `subject` | Betreff |
| `introText` | Einleitungstext |
| `outroText` | Schlusstext (auch für optionale Leistungen) |
| `lines[].type` | Typ: `einmalig` → Einmalig, `monatlich` → Monatlich |
| `lines[].title` / `description` | Titel / Beschreibung |
| `lines[].quantity` / `unitPrice` | Menge / Einzelpreis (netto, EUR) |
| `lines[].vatPercent` | MwSt (19, 7 oder 0; Standard 19) |
| `lines[].discountPercent` | Rabatt in % (optional) |
| `lines[].unit` | Kein eigenes Feld: „pauschal“/„Stk“ wird ignoriert, jede andere Einheit wird als „Einheit: …“ an die Beschreibung angehängt |

Nicht gesetzte Texte (`subject`, `introText`, `outroText`) bleiben unverändert. Steuer, Zahlungsbedingungen, Rechtliches, Preisangebot und Notizen werden nicht angefasst. Optionale Positionen kennt das Angebot nicht – sie gehören als Text in den `outroText`.

## Prompt & Schema

```text
Du erstellst aus dem folgenden Briefing bzw. der Aufwandsschätzung ein Angebot für unser CRM (Gentlesuite).

Antworte AUSSCHLIESSLICH mit einem einzigen JSON-Objekt nach dem Schema unten – kein Markdown, keine Erklärungen, kein Text davor oder danach.

Regeln:
- Alle Preise sind Nettopreise in EUR als Zahl (Punkt als Dezimaltrenner, keine Tausendertrennzeichen, kein Währungssymbol), z. B. 1250.5
- "type": "einmalig" für Projekt-/Einmalleistungen, "monatlich" für laufende monatliche Leistungen (z. B. Hosting, Wartung, Retainer). unitPrice ist bei "monatlich" der Preis pro Monat.
- Pauschalpreise: quantity 1, unit "pauschal".
- Aufwand nach Zeit: quantity = Anzahl (z. B. Stunden), unit = Einheit (z. B. "Stunden"), unitPrice = Preis pro Einheit.
- vatPercent: 19 (Standard), 7 oder 0. Weglassen = 19.
- discountPercent ist optional (0–100), nur angeben, wenn ein Rabatt gewünscht ist.
- title kurz und prägnant (Pflichtfeld), description mit den enthaltenen Leistungen (Zeilenumbrüche mit \n).
- introText: kurze, freundliche Einleitung an den Kunden. outroText: Abschluss (z. B. nächste Schritte).
- Optionale Leistungen/Alternativen NICHT als Position aufnehmen, sondern als Text im outroText aufführen (inkl. Preis).
- Felder, die du nicht befüllen kannst, weglassen statt erfinden.

Schema (Beispiel):
{
  "subject": "Relaunch Website Muster GmbH",
  "introText": "Sehr geehrte Damen und Herren,\nvielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgendes Angebot:",
  "outroText": "Optional: Mehrsprachigkeit (EN) für 1.200,00 € netto.\nWir freuen uns auf Ihre Rückmeldung.",
  "lines": [
    {
      "type": "einmalig",
      "title": "Konzeption & Design",
      "description": "Workshop, Sitemap, Wireframes\nDesign Startseite + 3 Unterseiten",
      "quantity": 1,
      "unit": "pauschal",
      "unitPrice": 2400,
      "vatPercent": 19
    },
    {
      "type": "einmalig",
      "title": "Umsetzung",
      "description": "Entwicklung im CMS inkl. Responsive Design",
      "quantity": 32,
      "unit": "Stunden",
      "unitPrice": 95,
      "vatPercent": 19,
      "discountPercent": 10
    },
    {
      "type": "monatlich",
      "title": "Hosting & Wartung",
      "description": "Hosting, Updates, Backups",
      "quantity": 1,
      "unit": "pauschal",
      "unitPrice": 49,
      "vatPercent": 19
    }
  ]
}

Briefing / Schätzung:
```
