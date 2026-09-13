/**
 * Compats an array of issue numbers into human- and LLM-friendly range notation.
 * E.g. ["1", "2", "3", "5", "8", "9", "10"] => "#1-3, #5, #8-10"
 * Non-integer strings (e.g. "Special 1", "0.5") are preserved at the end.
 */
export function compactNumberRanges(numbers: string[]): string {
  if (numbers.length === 0) return "Keine";

  const integerValues: number[] = [];
  const otherValues: string[] = [];

  for (const raw of numbers) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    // Check if it is a pure non-negative integer
    if (/^\d+$/.test(trimmed)) {
      integerValues.push(parseInt(trimmed, 10));
    } else {
      otherValues.push(trimmed);
    }
  }

  // Deduplicate and sort integers ascending
  const sortedInts = Array.from(new Set(integerValues)).sort((a, b) => a - b);

  const rangeSegments: string[] = [];
  let i = 0;
  while (i < sortedInts.length) {
    const start = sortedInts[i];
    let end = start;

    while (i + 1 < sortedInts.length && sortedInts[i + 1] === end + 1) {
      end = sortedInts[i + 1];
      i++;
    }

    if (start === end) {
      rangeSegments.push(`#${start}`);
    } else if (end === start + 1) {
      rangeSegments.push(`#${start}, #${end}`);
    } else {
      rangeSegments.push(`#${start}-${end}`);
    }
    i++;
  }

  const allParts = [...rangeSegments, ...otherValues];
  return allParts.length > 0 ? allParts.join(", ") : "Keine";
}
