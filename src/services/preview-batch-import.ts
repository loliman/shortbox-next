import type {
  PreviewImportQueue,
  StagedDraftStatus,
  StagedPreviewDraft,
  StagedPreviewImport,
} from "../types/preview-import";
import { classifyDraftForMarvelScope } from "./preview-marvel-filter";

export interface PreviewSeriesIssueMatcher {
  findDeSeries(title: string): Promise<{ id: string | number; title: string; volume: number; publisherName: string } | null>;
  issueExists(seriesId: string | number, number: string): Promise<boolean>;
}

export interface BuildStagedImportOptions {
  queue: PreviewImportQueue;
  previewNumber: number;
  sourceUrl?: string;
  matcher: PreviewSeriesIssueMatcher;
}

export async function buildStagedPreviewImport(
  options: BuildStagedImportOptions
): Promise<StagedPreviewImport> {
  const { queue, previewNumber, sourceUrl, matcher } = options;

  const stagedDrafts: StagedPreviewDraft[] = [];
  let readyCount = 0;
  let newSeriesCount = 0;
  let duplicateCount = 0;
  let inScopeDrafts = 0;

  for (const draft of queue.drafts) {
    const classification = classifyDraftForMarvelScope(draft);
    const inScope = classification.inScope;
    if (inScope) inScopeDrafts += 1;

    const seriesTitle = draft.values.series.title.trim();
    const isVariant = Boolean(draft.variantOfDraftId || draft.values.variant);
    const existingSeries = seriesTitle ? await matcher.findDeSeries(seriesTitle) : null;

    let status: StagedDraftStatus = "READY";
    let statusMessage = "";
    let selected = inScope;

    const publisherName =
      existingSeries?.publisherName ||
      (classification.category === "star_wars"
        ? "Panini - Star Wars & Generation"
        : "Panini - Marvel & Icon");

    if (existingSeries) {
      const alreadyExists = await matcher.issueExists(existingSeries.id, draft.values.number);
      if (alreadyExists && !isVariant) {
        status = "DUPLICATE";
        selected = false;
        duplicateCount += 1;
        statusMessage = `Heft #${draft.values.number} existiert bereits in ${existingSeries.title}`;
      } else {
        status = "READY";
        if (inScope) readyCount += 1;
      }
    } else {
      status = "NEW_SERIES";
      if (inScope) newSeriesCount += 1;
      statusMessage = "Serie existiert noch nicht in der Datenbank (wird neu angelegt)";
    }

    const storiesCount = draft.values.stories?.length || 0;
    const storiesSummary = draft.values.stories
      ?.map((s) => {
        const p = (s as { parent?: { issue?: { series?: { title?: string }; number?: string } } })?.parent?.issue;
        return p?.series?.title && p?.number ? `${p.series.title} #${p.number}` : "";
      })
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");

    stagedDrafts.push({
      id: draft.id,
      sourceTitle: draft.sourceTitle,
      issueCode: draft.issueCode,
      category: classification.category,
      inScope,
      selected,
      status,
      statusMessage,
      isVariant,
      parentDraftId: draft.variantOfDraftId ?? null,
      series: {
        id: existingSeries?.id ?? null,
        title: existingSeries?.title ?? seriesTitle,
        volume: Number(existingSeries?.volume || draft.values.series.volume || 1),
        isNew: !existingSeries,
        publisherName,
      },
      issue: {
        number: draft.values.number,
        title: draft.values.title,
        format: draft.values.format,
        variant: draft.values.variant,
        releasedate: draft.values.releasedate,
        pages: draft.values.pages,
        price: draft.values.price ? parseFloat(draft.values.price.replace(",", ".")) : undefined,
        currency: draft.values.currency || "EUR",
        limitation: draft.values.limitation,
        addinfo: draft.values.addinfo,
        storiesCount,
        storiesSummary: storiesSummary ? `${storiesSummary}${storiesCount > 3 ? "..." : ""}` : undefined,
      },
      rawDraft: draft,
    });
  }

  const now = new Date().toISOString();
  return {
    id: `pv-${previewNumber}`,
    previewNumber,
    title: `Panini Vorschau ${previewNumber}`,
    sourceUrl,
    fileName: queue.fileName,
    status: "PENDING_REVIEW",
    createdAt: now,
    updatedAt: now,
    totalDrafts: stagedDrafts.length,
    inScopeDrafts,
    readyCount,
    newSeriesCount,
    duplicateCount,
    drafts: stagedDrafts,
  };
}

export async function syncStagedImportWithDatabase(
  staged: StagedPreviewImport,
  matcher: PreviewSeriesIssueMatcher
): Promise<void> {
  let readyCount = 0;
  let newSeriesCount = 0;
  let duplicateCount = 0;

  const seriesCache = new Map<
    string,
    { id: string | number; title: string; volume: number; publisherName: string } | null
  >();

  for (const draft of staged.drafts) {
    if (draft.status === "COMMITTED") {
      draft.selected = false;
      continue;
    }

    const seriesTitle = (draft.series.title || draft.rawDraft.values.series.title || "").trim();
    const cacheKey = seriesTitle.toLowerCase();
    let existingSeries: { id: string | number; title: string; volume: number; publisherName: string } | null;

    if (seriesCache.has(cacheKey)) {
      existingSeries = seriesCache.get(cacheKey)!;
    } else {
      existingSeries = seriesTitle ? await matcher.findDeSeries(seriesTitle) : null;
      seriesCache.set(cacheKey, existingSeries);
    }

    const isVariant = Boolean(draft.parentDraftId || draft.rawDraft.values.variant);
    const issueNum = String(draft.issue.number ?? draft.rawDraft.values.number ?? "");

    if (existingSeries) {
      draft.series.id = existingSeries.id;
      draft.series.title = existingSeries.title;
      draft.series.volume = Number(existingSeries.volume || draft.series.volume || 1);
      draft.series.isNew = false;
      draft.series.publisherName = existingSeries.publisherName;

      const exists = await matcher.issueExists(existingSeries.id, issueNum);
      if (exists) {
        if (!isVariant) {
          if (draft.status === "READY" || draft.status === "NEW_SERIES") {
            draft.status = "COMMITTED";
            draft.selected = false;
            draft.statusMessage = `Heft #${issueNum} wurde bereits importiert`;
          } else {
            draft.status = "DUPLICATE";
            draft.selected = false;
            draft.statusMessage = `Heft #${issueNum} existiert bereits in ${existingSeries.title}`;
          }
        }
      } else {
        draft.status = "READY";
        draft.statusMessage = undefined;
      }
    } else {
      draft.series.isNew = true;
      draft.status = "NEW_SERIES";
      draft.statusMessage = "Serie existiert noch nicht in der Datenbank (wird neu angelegt)";
    }

    if (draft.inScope) {
      if (draft.status === "READY") readyCount += 1;
      else if (draft.status === "NEW_SERIES") newSeriesCount += 1;
      else if (draft.status === "DUPLICATE") duplicateCount += 1;
    }
  }

  staged.readyCount = readyCount;
  staged.newSeriesCount = newSeriesCount;
  staged.duplicateCount = duplicateCount;
  staged.updatedAt = new Date().toISOString();
}

