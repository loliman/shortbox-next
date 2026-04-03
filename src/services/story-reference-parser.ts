export interface StoryIssueReference {
  seriesTitle: string;
  volume: number;
  issueNumber: string;
}

export interface StoryReferenceParseResult {
  references: StoryIssueReference[];
  error?: string;
}

interface StoryReferenceContext {
  seriesTitle: string;
  volume: number;
}

const DASH_PATTERN = /[‐‑–—]/g;
const VOLUME_PATTERN = /\s+(?:vol(?:ume)?|v)\.?\s*(\d+)$/i;

export function parseStoryReferences(input: string): StoryReferenceParseResult {
  const normalizedInput = normalizeInput(input);
  if (!normalizedInput) return { references: [] };

  const segments = normalizedInput
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const references: StoryIssueReference[] = [];
  const seen = new Set<string>();
  let context: StoryReferenceContext | null = null;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const parsed = parseSegment(segment, context);

    if (!parsed) {
      return createSegmentParseError(segment, index);
    }

    context = parsed.context;
    addUniqueReferences(references, seen, parsed.references);
  }

  return { references };
}

function parseSegment(
  segment: string,
  context: StoryReferenceContext | null
): { references: StoryIssueReference[]; context: StoryReferenceContext } | null {
  const contextIssueNumbers = parseContextIssueNumbers(segment);
  if (contextIssueNumbers && context) {
    return createContextReferences(context, contextIssueNumbers);
  }

  const issueMatch = /((?:annual\s+\d+(?:-\d+)?)|(?:#?[A-Za-z0-9]+(?:-\#?[A-Za-z0-9]+)?))$/i.exec(segment);
  if (!issueMatch) return null;

  const rawIssueSpec = issueMatch[1]?.trim() || "";
  const rawSeriesSpec = segment.slice(0, Math.max(0, segment.length - rawIssueSpec.length)).trim();
  if (!rawSeriesSpec) return null;

  const parsedSeriesContext = parseSeriesContext(rawSeriesSpec);
  if (!parsedSeriesContext) return null;

  const { seriesTitle, volume } = parsedSeriesContext;
  if (!seriesTitle || !Number.isFinite(volume) || volume <= 0) return null;

  const issueNumbers = parseIssueNumbers(rawIssueSpec);
  if (!issueNumbers) return null;

  const nextContext = { seriesTitle, volume };
  return {
    context: nextContext,
    references: issueNumbers.map((issueNumber) => ({
      seriesTitle,
      volume,
      issueNumber,
    })),
  };
}

function createSegmentParseError(
  segment: string,
  index: number
): StoryReferenceParseResult {
  return {
    references: [],
    error: `Konnte Segment ${index + 1} nicht lesen: "${segment}". Erwartet wird z.B. "Strange Tales 110-111" oder "Amazing Spider-Man Annual 2".`,
  };
}

function addUniqueReferences(
  target: StoryIssueReference[],
  seen: Set<string>,
  incoming: StoryIssueReference[]
) {
  for (const reference of incoming) {
    const key = [
      reference.seriesTitle.toLowerCase(),
      String(reference.volume),
      reference.issueNumber,
    ].join("::");
    if (seen.has(key)) continue;
    seen.add(key);
    target.push(reference);
  }
}

function createContextReferences(
  context: StoryReferenceContext,
  issueNumbers: string[]
) {
  return {
    context,
    references: issueNumbers.map((issueNumber) => ({
      seriesTitle: context.seriesTitle,
      volume: context.volume,
      issueNumber,
    })),
  };
}

function parseSeriesContext(rawSeriesSpec: string): StoryReferenceContext | null {
  const seriesSpec = stripTrailingPunctuation(rawSeriesSpec);
  const volumeMatch = VOLUME_PATTERN.exec(seriesSpec);
  const volume = volumeMatch ? Number.parseInt(volumeMatch[1], 10) : 1;
  const volumeMatchIndex =
    volumeMatch && typeof volumeMatch.index === "number" ? volumeMatch.index : undefined;
  const seriesTitle = stripTrailingPunctuation(
    volumeMatchIndex !== undefined
      ? seriesSpec.slice(0, Math.max(0, volumeMatchIndex)).trim()
      : seriesSpec
  );
  if (!seriesTitle || !Number.isFinite(volume) || volume <= 0) return null;

  return { seriesTitle, volume };
}

function parseContextIssueNumbers(value: string): string[] | null {
  const normalized = stripTrailingPunctuation(value).replace(/^#/, "").trim();
  if (!normalized) return null;
  if (!/^(?:annual\s+\d+(?:-\d+)?|\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)$/i.test(normalized)) {
    return null;
  }

  return parseIssueNumbers(normalized);
}

function parseIssueNumbers(value: string): string[] | null {
  const normalized = stripTrailingPunctuation(value).replace(/^#/, "").trim();
  if (!normalized) return null;

  const annualRangeMatch = /^annual\s+(\d+)(?:-(\d+))?$/i.exec(normalized);
  if (annualRangeMatch) {
    const start = Number.parseInt(annualRangeMatch[1], 10);
    const end = annualRangeMatch[2] ? Number.parseInt(annualRangeMatch[2], 10) : start;
    if (!isValidRange(start, end)) return null;
    return expandNumericRange(start, end).map((number) => `Annual ${number}`);
  }

  const numericRangeMatch = /^(\d+)([A-Za-z]?)(?:-(\d+)([A-Za-z]?))?$/.exec(normalized);
  if (numericRangeMatch) {
    const start = Number.parseInt(numericRangeMatch[1], 10);
    const startSuffix = numericRangeMatch[2] || "";
    const end = numericRangeMatch[3] ? Number.parseInt(numericRangeMatch[3], 10) : start;
    const endSuffix = numericRangeMatch[4] || startSuffix;

    if (!numericRangeMatch[3]) {
      return [`${start}${startSuffix}`];
    }

    if (startSuffix || endSuffix) {
      if (start === end && startSuffix === endSuffix) return [`${start}${startSuffix}`];
      return [normalized];
    }

    if (!isValidRange(start, end)) return null;
    return expandNumericRange(start, end).map(String);
  }

  return [normalized];
}

function expandNumericRange(start: number, end: number): number[] {
  const values: number[] = [];
  for (let current = start; current <= end; current += 1) {
    values.push(current);
  }
  return values;
}

function isValidRange(start: number, end: number) {
  return Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start;
}

function normalizeInput(input: string) {
  return input
    .replaceAll(DASH_PATTERN, "-")
    .replaceAll(/[;\n\r]+/g, ",")
    .trim();
}

function stripTrailingPunctuation(value: string) {
  return value.replaceAll(/[.,]+$/g, "").trim();
}
