/**
 * Berechnet den Standard-Verkaufspreis für eBay.
 * Formel: 70% vom Originalpreis, aufgerundet auf den nächsten vollen Euro.
 * Fallback: Falls kein Originalpreis vorhanden ist, wird der angegebene Fallback-Wert genommen.
 */
export function calculateEbayPrice(
  originalPrice: number | null | undefined,
  fallbackPrice: number = 5.0
): number {
  if (originalPrice == null || originalPrice <= 0) {
    return fallbackPrice;
  }
  return Math.ceil(originalPrice * 0.7);
}

/**
 * Berechnet den eBay-Verkaufspreis für eine komplette Serie.
 * Formel: 70% der Summe aller günstigsten Varianten der enthaltenen Hefte.
 * Falls ein Heft keinen Originalpreis besitzt, wird ein Standardwert von 5,00 € angenommen.
 * Fallback: Wenn kein einziges Heft einen Preis besitzt (oder die Liste leer ist), wird 100,00 € zurückgegeben.
 */
export function calculateSeriesEbayPrice(
  issueVariants: { price: number | null }[]
): number {
  if (issueVariants.length === 0) {
    return 100.00;
  }

  let totalOriginal = 0;
  let hasAnyOriginalPrice = false;

  for (const iv of issueVariants) {
    if (iv.price != null && iv.price > 0) {
      totalOriginal += iv.price;
      hasAnyOriginalPrice = true;
    } else {
      totalOriginal += 5.00; // standard fallback original price for missing ones
    }
  }

  if (!hasAnyOriginalPrice) {
    return 100.00;
  }

  const calculated = Math.ceil(totalOriginal * 0.7);
  return calculated > 0 ? calculated : 100.00;
}

/**
 * Generiert den eBay-Titel für eine komplette Serie.
 * Kürzungsreihenfolge:
 * 1. Volume-Angabe (Vol. X) entfernen.
 * 2. Startjahr entfernen.
 */
export function formatSeriesEbayTitle(params: {
  seriesTitle: string;
  volume: number;
  startYear: number;
  conditionCode: string;
}): string {
  const suffix = ` - Komplette Serie, Zustand ${params.conditionCode}`;
  const volStr = params.volume > 1 ? ` (Vol. ${params.volume})` : "";
  const yearStr = ` (${params.startYear})`;

  const clean = (str: string) => str.replace(/\s+/g, " ").trim();

  // Version 1: Voll
  let candidate = clean(`${params.seriesTitle}${volStr}${yearStr}${suffix}`);
  if (candidate.length <= 80) return candidate;

  // Version 2: Ohne Vol
  candidate = clean(`${params.seriesTitle}${yearStr}${suffix}`);
  if (candidate.length <= 80) return candidate;

  // Version 3: Ohne Jahr
  candidate = clean(`${params.seriesTitle}${suffix}`);
  if (candidate.length <= 80) return candidate;

  // Version 4: Serie extrem kürzen
  const maxSeriesLen = 80 - suffix.length - 3;
  if (maxSeriesLen > 0 && params.seriesTitle.length > maxSeriesLen) {
    const truncated = params.seriesTitle.slice(0, maxSeriesLen) + "...";
    return clean(`${truncated}${suffix}`);
  }

  return candidate;
}

/**
 * Formatiert eine Liste von Heftnummern. Falls sie eine fortlaufende Sequenz bilden,
 * wird sie als Range (z. B. "#1 - #10") formatiert, andernfalls kommagetrennt.
 */
export function formatIssueNumbersList(numbers: string[]): string {
  if (numbers.length === 0) return "";

  // Versuche als Integer zu parsen
  const parsed = numbers.map(n => parseInt(n, 10));
  const isContiguous = parsed.every((val, index) => {
    if (index === 0) return true;
    return val === parsed[index - 1] + 1;
  }) && !parsed.some(isNaN);

  if (isContiguous && numbers.length > 2) {
    return `#${numbers[0]} - #${numbers[numbers.length - 1]}`;
  }

  return numbers.map(n => `#${n}`).join(", ");
}

/**
 * Generiert den eBay-Titel und sorgt dafür, dass er die Grenze von 80 Zeichen nicht überschreitet.
 * Kürzungsreihenfolge:
 * 1. Zusatztitel komplett entfernen oder kürzen.
 * 2. Volume-Angabe (Vol. X) entfernen (falls Volume > 1).
 * 3. Startjahr entfernen.
 * Heftnummer und Zustand bleiben immer erhalten.
 */
export function formatEbayTitle(params: {
  seriesTitle: string;
  volume: number;
  startYear: number;
  number: string;
  issueTitle?: string | null;
  variantLabel?: string | null;
  conditionCode: string; // z.B. "Z1"
}): string {
  const conditionStr = `, Zustand ${params.conditionCode}`;
  const numberStr = ` #${params.number}`;
  const variantStr = params.variantLabel ? ` (${params.variantLabel})` : "";

  // Helper zum Bereinigen von Leerzeichen
  const clean = (str: string) => str.replace(/\s+/g, " ").trim();

  // Version 1: Volle Pracht (mit Zusatztitel, Volume, Jahr und Variante)
  const volStr = params.volume > 1 ? ` (Vol. ${params.volume})` : "";
  const yearStr = ` (${params.startYear})`;
  const issueTitleStr = params.issueTitle ? ` - ${params.issueTitle}` : "";

  let candidate = clean(`${params.seriesTitle}${volStr}${yearStr}${numberStr}${variantStr}${issueTitleStr}${conditionStr}`);
  if (candidate.length <= 80) return candidate;

  // Version 2: Zusatztitel weglassen
  candidate = clean(`${params.seriesTitle}${volStr}${yearStr}${numberStr}${variantStr}${conditionStr}`);
  if (candidate.length <= 80) return candidate;

  // Version 3: Volume weglassen
  candidate = clean(`${params.seriesTitle}${yearStr}${numberStr}${variantStr}${conditionStr}`);
  if (candidate.length <= 80) return candidate;

  // Version 4: Startjahr weglassen
  candidate = clean(`${params.seriesTitle}${numberStr}${variantStr}${conditionStr}`);
  if (candidate.length <= 80) return candidate;

  // Version 5: Serie extrem kürzen (Fallback)
  const fixedPartLength = numberStr.length + variantStr.length + conditionStr.length + 3; // 3 für ...
  const maxSeriesLen = 80 - fixedPartLength;
  if (maxSeriesLen > 0 && params.seriesTitle.length > maxSeriesLen) {
    const truncatedSeries = params.seriesTitle.slice(0, maxSeriesLen) + "...";
    return clean(`${truncatedSeries}${numberStr}${variantStr}${conditionStr}`);
  }

  return candidate;
}

/**
 * Generiert die HTML-Beschreibung für das eBay-Inserat.
 */
export function formatEbayDescription(params: {
  title: string;
  year: number;
  publisher: string;
  conditionCode: string; // z.B. "Z1"
  issueNumbersStr?: string | null;
}): string {
  const publisherClean = params.publisher || "Panini";
  const containsStr = params.issueNumbersStr ? ` Enthält die Ausgaben: ${params.issueNumbersStr}.` : "";
  return `<p>Sie bieten hier auf den Band/die Serie <strong>${params.title}</strong> aus dem Jahr <strong>${params.year}</strong> vom <strong>${publisherClean}</strong> Verlag.${containsStr} Der Band/die Serie ist in einem sehr guten Zustand (${params.conditionCode}). Da ich aktuell meine Sammlung ausmiste habe ich sehr viel weiteres eingestellt. Beachten Sie auch meine weiteren Auktionen um Versand zu sparen!</p>

<hr />

<h3>Versand- und Zahlungsbedingungen:</h3>
<ul>
  <li><strong>Versand (DHL):</strong> Maxibrief/Großbrief oder Paket je nach Größe.
    <ul>
      <li>Unter 120 Seiten gesamt: 3,00 €</li>
      <li>Ab 120 Seiten: 7,00 €</li>
      <li>Ab 200 Seiten: 8,50 €</li>
      <li>Ab 100,00 € Einkaufswert: <strong>Versandkostenfrei!</strong></li>
    </ul>
  </li>
  <li><strong>Abholung:</strong> Eine persönliche Abholung vor Ort ist möglich.</li>
  <li><strong>Zahlungsarten:</strong> Überweisung, bar bei Abholung oder über die eBay-Zahlungsabwicklung.</li>
  <li><strong>Rechtlicher Hinweis:</strong> Privatverkauf. Der Verkauf erfolgt unter Ausschluss jeglicher Sachmängelhaftung. Keine Rücknahme oder Umtausch.</li>
</ul>`.trim();
}
