interface IssueSeriesMeta {
  title?: string;
  volume?: number;
}

interface IssueSaveFeedbackOptions {
  createdCount: number;
  issueLabel: string;
  successMessage: string;
  createdSeries?: IssueSeriesMeta;
}

export function buildIssueSaveSuccessMessage({
  createdCount,
  issueLabel,
  successMessage,
  createdSeries,
}: IssueSaveFeedbackOptions) {
  const baseMessage =
    createdCount > 1 ? `${createdCount} Varianten erfolgreich gespeichert` : `${issueLabel}${successMessage}`;

  const seriesNote = buildAutoCreatedSeriesNote(createdSeries);
  if (!seriesNote) return baseMessage;
  return `${baseMessage} ${seriesNote}`;
}

function buildAutoCreatedSeriesNote(series: IssueSeriesMeta | undefined) {
  const title = String(series?.title || "").trim();
  const volume = Number(series?.volume || 0);
  if (!title) return "";
  if (!Number.isFinite(volume)) return `Serie "${title}" wurde automatisch angelegt.`;

  return `Serie "${title}" Vol. ${volume} wurde automatisch angelegt.`;
}
