export type CleanupTaskPayload = {
  dryRun?: boolean;
};

export type UpdateStoryFiltersTaskPayload = {
  dryRun?: boolean;
  batchSize?: number;
};

export type RebuildSearchIndexTaskPayload = {
  dryRun?: boolean;
};

export type UpdateDeSeriesGenresTaskPayload = {
  dryRun?: boolean;
};

export type AdminTaskPayloads = {
  "cleanup-db": CleanupTaskPayload;
  "update-story-badges": UpdateStoryFiltersTaskPayload;
  "rebuild-search-index": RebuildSearchIndexTaskPayload;
  "update-de-series-genres": UpdateDeSeriesGenresTaskPayload;
};

export type AdminTaskName = keyof AdminTaskPayloads;

export type AdminTaskDefinition<TName extends AdminTaskName = AdminTaskName> = {
  name: TName;
  label: string;
  description: string;
};

export const ADMIN_TASK_DEFINITIONS: AdminTaskDefinition[] = [
  {
    name: "cleanup-db",
    label: "Cleanup",
    description: "Entfernt inkonsistente Daten in der Datenbank.",
  },
  {
    name: "update-story-badges",
    label: "Update Story Badges",
    description: "Berechnet Story Badges für alle Issues neu.",
  },
  {
    name: "rebuild-search-index",
    label: "Rebuild Search Index",
    description: "Baut den QuickSearch-Index aus Publishern, Serien und Ausgaben neu auf.",
  },
  {
    name: "update-de-series-genres",
    label: "Update DE Series Genres",
    description: "Leitet Genres fuer DE-Serien aus verknuepften US-Stories und deren US-Serien ab.",
  },
];

export const ADMIN_TASK_DEFINITION_BY_NAME: Record<AdminTaskName, AdminTaskDefinition> = {
  "cleanup-db": ADMIN_TASK_DEFINITIONS[0],
  "update-story-badges": ADMIN_TASK_DEFINITIONS[1],
  "rebuild-search-index": ADMIN_TASK_DEFINITIONS[2],
  "update-de-series-genres": ADMIN_TASK_DEFINITIONS[3],
};

export const isAdminTaskName = (value: string): value is AdminTaskName =>
  ADMIN_TASK_DEFINITIONS.some((task) => task.name === value);

export const MAX_TASK_DETAILS_CHARS = 1_000_000;

export const toStoredDetails = (details: string): string => {
  if (details.length <= MAX_TASK_DETAILS_CHARS) return details;
  return (
    details.slice(0, MAX_TASK_DETAILS_CHARS) +
    "\n\n[truncated] details exceeded storage limit and were truncated."
  );
};
