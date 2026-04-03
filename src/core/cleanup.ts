import { prisma } from "../lib/prisma/client";

const MAX_REPORTED_ITEMS = 100;

type CleanupStageResult = {
  step: string;
  count: number;
  ids: number[];
  items: string[];
  truncated: boolean;
};

export type CleanupDryRunReport = {
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  totalAffected: number;
  stages: CleanupStageResult[];
};

export type CleanupRunOptions = {
  dryRun?: boolean;
};

type PublisherRow = {
  id: number;
  name: string;
  original: boolean;
};

type SeriesRow = {
  id: number;
  title: string;
  volume: number;
  fkPublisher: number | null;
};

type IssueRow = {
  id: number;
  number: string;
  variant: string;
  fkSeries: number | null;
};

type CoverRow = {
  id: number;
  fkIssue: number | null;
};

type StoryRow = {
  id: number;
  number: number;
  fkIssue: number | null;
  fkParent: number | null;
  fkReprint: number | null;
};

type IndividualRow = {
  id: number;
  name: string;
};

type AppearanceRow = {
  id: number;
  name: string;
  type: string;
};

type ArcRow = {
  id: number;
  title: string;
  type: string;
};

const toInt = (value: unknown): number | null => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const intValue = Math.trunc(num);
  return intValue > 0 ? intValue : null;
};

const uniqueSortedIds = (ids: Iterable<number>): number[] =>
  Array.from(new Set(ids)).sort((a, b) => a - b);

const formatItems = (
  ids: number[],
  formatter: (id: number) => string
): { items: string[]; truncated: boolean } => {
  const truncated = ids.length > MAX_REPORTED_ITEMS;
  const selected = ids.slice(0, MAX_REPORTED_ITEMS);
  return {
    items: selected.map((id) => formatter(id)),
    truncated,
  };
};

const toStageResult = (
  step: string,
  ids: number[],
  formatter: (id: number) => string
): CleanupStageResult => {
  const sortedIds = uniqueSortedIds(ids);
  const { items, truncated } = formatItems(sortedIds, formatter);
  return {
    step,
    count: sortedIds.length,
    ids: sortedIds,
    items,
    truncated,
  };
};

const resolveDryRun = (options?: CleanupRunOptions): boolean => {
  if (typeof options?.dryRun === "boolean") return options.dryRun;
  return String(process.env.CLEANUP_DRY_RUN || "false").toLowerCase() === "true";
};

const markDeleted = (ids: number[], activeIds: Set<number>) => {
  for (const id of ids) activeIds.delete(id);
};

const deleteByIds = async (
  deleteFn: (ids: bigint[]) => Promise<unknown>,
  ids: number[],
  dryRun: boolean
) => {
  if (dryRun || ids.length === 0) return;
  await deleteFn(ids.map((id) => BigInt(id)));
};

const distinctOwnerIdsForActiveRefs = async (
  findRows: () => Promise<Array<{ ownerId: bigint }>>,
  activeRefIds: Set<number>
): Promise<Set<number>> => {
  if (activeRefIds.size === 0) return new Set<number>();

  const rows = await findRows();
  const owners = new Set<number>();

  rows.forEach((row) => {
    const owner = toInt(row.ownerId);
    if (owner != null) owners.add(owner);
  });

  return owners;
};

const toBigIntIds = (ids: Set<number>) => [...ids].map((id) => BigInt(id));

const mapOwnerRows = <T extends bigint>(rows: Array<T>, key: "fkIndividual" | "fkAppearance" | "fkArc") =>
  rows.map((row) => ({ ownerId: (row as unknown as Record<string, bigint>)[key] }));

const readLinkedIndividualIdsForIssues = (
  tx: typeof prisma,
  activeIssueIds: Set<number>
) =>
  distinctOwnerIdsForActiveRefs(
    () =>
      tx.issueIndividual
        .findMany({
          where: { fkIssue: { in: toBigIntIds(activeIssueIds) } },
          distinct: ["fkIndividual"],
          select: { fkIndividual: true },
        })
        .then((rows) => mapOwnerRows(rows, "fkIndividual")),
    activeIssueIds
  );

const readLinkedIndividualIdsForStories = (
  tx: typeof prisma,
  activeStoryIds: Set<number>
) =>
  distinctOwnerIdsForActiveRefs(
    () =>
      tx.storyIndividual
        .findMany({
          where: { fkStory: { in: toBigIntIds(activeStoryIds) } },
          distinct: ["fkIndividual"],
          select: { fkIndividual: true },
        })
        .then((rows) => mapOwnerRows(rows, "fkIndividual")),
    activeStoryIds
  );

const readLinkedIndividualIdsForCovers = (
  tx: typeof prisma,
  activeCoverIds: Set<number>
) =>
  distinctOwnerIdsForActiveRefs(
    () =>
      tx.coverIndividual
        .findMany({
          where: { fkCover: { in: toBigIntIds(activeCoverIds) } },
          distinct: ["fkIndividual"],
          select: { fkIndividual: true },
        })
        .then((rows) => mapOwnerRows(rows, "fkIndividual")),
    activeCoverIds
  );

const readLinkedAppearanceIdsForStories = (
  tx: typeof prisma,
  activeStoryIds: Set<number>
) =>
  distinctOwnerIdsForActiveRefs(
    () =>
      tx.storyAppearance
        .findMany({
          where: { fkStory: { in: toBigIntIds(activeStoryIds) } },
          distinct: ["fkAppearance"],
          select: { fkAppearance: true },
        })
        .then((rows) => mapOwnerRows(rows, "fkAppearance")),
    activeStoryIds
  );

const readLinkedArcIdsForIssues = (
  tx: typeof prisma,
  activeIssueIds: Set<number>
) =>
  distinctOwnerIdsForActiveRefs(
    () =>
      tx.issueArc
        .findMany({
          where: { fkIssue: { in: toBigIntIds(activeIssueIds) } },
          distinct: ["fkArc"],
          select: { fkArc: true },
        })
        .then((rows) => mapOwnerRows(rows, "fkArc")),
    activeIssueIds
  );

const findUSIssueIdsWithoutDEReference = ({
  publishers,
  series,
  issues,
  stories,
}: {
  publishers: PublisherRow[];
  series: SeriesRow[];
  issues: IssueRow[];
  stories: StoryRow[];
}): { ids: number[] } => {
  const publisherById = new Map<number, PublisherRow>(publishers.map((row) => [row.id, row]));
  const seriesById = new Map<number, SeriesRow>(series.map((row) => [row.id, row]));
  const issueById = new Map<number, IssueRow>(issues.map((row) => [row.id, row]));

  const resolvePublisherOriginalByIssue = (issueId: number): boolean | null => {
    const issue = issueById.get(issueId);
    if (!issue) return null;
    const seriesItem = issue.fkSeries != null ? seriesById.get(issue.fkSeries) : null;
    if (!seriesItem || seriesItem.fkPublisher == null) return null;
    const publisher = publisherById.get(seriesItem.fkPublisher);
    return publisher ? Boolean(publisher.original) : null;
  };

  const usIssueIds = new Set<number>();
  const issueGroupKeyById = new Map<number, string>();
  const usIssueIdsByGroupKey = new Map<string, Set<number>>();

  issues.forEach((issue) => {
    if (resolvePublisherOriginalByIssue(issue.id) !== true) return;
    usIssueIds.add(issue.id);

    const seriesId = toInt(issue.fkSeries);
    if (seriesId == null) return;
    const groupKey = `${seriesId}::${issue.number}`;
    issueGroupKeyById.set(issue.id, groupKey);
    if (!usIssueIdsByGroupKey.has(groupKey)) usIssueIdsByGroupKey.set(groupKey, new Set<number>());
    usIssueIdsByGroupKey.get(groupKey)?.add(issue.id);
  });

  const storyById = new Map<number, StoryRow>();
  const usStoryIds = new Set<number>();
  const nonUSStoryIds = new Set<number>();

  stories.forEach((story) => {
    storyById.set(story.id, story);
    const issueId = toInt(story.fkIssue);
    if (issueId == null) return;
    if (usIssueIds.has(issueId)) usStoryIds.add(story.id);
    else nonUSStoryIds.add(story.id);
  });

  const startStoryIds = stories
    .filter((story) => usStoryIds.has(story.id))
    .filter((story) => {
      const parentId = toInt(story.fkParent);
      const reprintId = toInt(story.fkReprint);
      if (parentId != null && storyById.has(parentId)) return false;
      if (reprintId != null && storyById.has(reprintId)) return false;
      return true;
    })
    .map((story) => story.id);

  const reachableStoryIds = new Set<number>(startStoryIds);
  const storyChildrenByParentId = new Map<number, number[]>();
  const storyReprintsById = new Map<number, number[]>();

  stories.forEach((story) => {
    const parentId = toInt(story.fkParent);
    if (parentId != null) {
      if (!storyChildrenByParentId.has(parentId)) storyChildrenByParentId.set(parentId, []);
      storyChildrenByParentId.get(parentId)?.push(story.id);
    }

    const reprintId = toInt(story.fkReprint);
    if (reprintId != null) {
      if (!storyReprintsById.has(reprintId)) storyReprintsById.set(reprintId, []);
      storyReprintsById.get(reprintId)?.push(story.id);
    }
  });

  const queue = [...startStoryIds];
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId == null) continue;

    for (const nextId of [
      ...(storyChildrenByParentId.get(currentId) || []),
      ...(storyReprintsById.get(currentId) || []),
    ]) {
      if (reachableStoryIds.has(nextId)) continue;
      reachableStoryIds.add(nextId);
      queue.push(nextId);
    }
  }

  const reachableUSIssueIds = new Set<number>();
  reachableStoryIds.forEach((storyId) => {
    const story = storyById.get(storyId);
    if (!story) return;
    const issueId = toInt(story.fkIssue);
    if (issueId != null && usIssueIds.has(issueId)) reachableUSIssueIds.add(issueId);
  });

  const keptUSIssueIds = new Set<number>();
  reachableUSIssueIds.forEach((issueId) => {
    keptUSIssueIds.add(issueId);
    const groupKey = issueGroupKeyById.get(issueId);
    if (!groupKey) return;
    usIssueIdsByGroupKey.get(groupKey)?.forEach((groupedIssueId) => keptUSIssueIds.add(groupedIssueId));
  });

  return {
    ids: [...usIssueIds].filter((issueId) => !keptUSIssueIds.has(issueId)).sort((a, b) => a - b),
  };
};

export async function runCleanup(
  options?: CleanupRunOptions
): Promise<CleanupDryRunReport | null> {
  const startedAt = new Date().toISOString();
  const dryRun = resolveDryRun(options);

  try {
    return await prisma.$transaction(async (tx) => {
      const [
        publishersRaw,
        seriesRaw,
        issuesRaw,
        coversRaw,
        storiesRaw,
        individualsRaw,
        appearancesRaw,
        arcsRaw,
      ] = await Promise.all([
        tx.publisher.findMany({ select: { id: true, name: true, original: true } }),
        tx.series.findMany({
          select: { id: true, title: true, volume: true, fkPublisher: true },
        }),
        tx.issue.findMany({
          select: { id: true, number: true, variant: true, fkSeries: true },
        }),
        tx.cover.findMany({ select: { id: true, fkIssue: true } }),
        tx.story.findMany({
          select: { id: true, number: true, fkIssue: true, fkParent: true, fkReprint: true },
        }),
        tx.individual.findMany({ select: { id: true, name: true } }),
        tx.appearance.findMany({ select: { id: true, name: true, type: true } }),
        tx.arc.findMany({ select: { id: true, title: true, type: true } }),
      ]);

      const publishers: PublisherRow[] = publishersRaw.map((row) => ({
        id: Number(row.id),
        name: row.name,
        original: row.original,
      }));
      const series: SeriesRow[] = seriesRaw.map((row) => ({
        id: Number(row.id),
        title: row.title || "",
        volume: Number(row.volume),
        fkPublisher: toInt(row.fkPublisher),
      }));
      const issues: IssueRow[] = issuesRaw.map((row) => ({
        id: Number(row.id),
        number: row.number,
        variant: row.variant || "",
        fkSeries: toInt(row.fkSeries),
      }));
      const covers: CoverRow[] = coversRaw.map((row) => ({
        id: Number(row.id),
        fkIssue: toInt(row.fkIssue),
      }));
      const stories: StoryRow[] = storiesRaw.map((row) => ({
        id: Number(row.id),
        number: Number(row.number),
        fkIssue: toInt(row.fkIssue),
        fkParent: toInt(row.fkParent),
        fkReprint: toInt(row.fkReprint),
      }));
      const individuals: IndividualRow[] = individualsRaw.map((row) => ({
        id: Number(row.id),
        name: row.name,
      }));
      const appearances: AppearanceRow[] = appearancesRaw.map((row) => ({
        id: Number(row.id),
        name: row.name,
        type: row.type,
      }));
      const arcs: ArcRow[] = arcsRaw.map((row) => ({
        id: Number(row.id),
        title: row.title,
        type: row.type,
      }));

      const publisherById = new Map<number, PublisherRow>(publishers.map((row) => [row.id, row]));
      const seriesById = new Map<number, SeriesRow>(series.map((row) => [row.id, row]));
      const issueById = new Map<number, IssueRow>(issues.map((row) => [row.id, row]));
      const coverById = new Map<number, CoverRow>(covers.map((row) => [row.id, row]));
      const storyById = new Map<number, StoryRow>(stories.map((row) => [row.id, row]));
      const individualById = new Map<number, IndividualRow>(individuals.map((row) => [row.id, row]));
      const appearanceById = new Map<number, AppearanceRow>(appearances.map((row) => [row.id, row]));
      const arcById = new Map<number, ArcRow>(arcs.map((row) => [row.id, row]));

      const activePublisherIds = new Set(publishers.map((row) => row.id));
      const activeSeriesIds = new Set(series.map((row) => row.id));
      const activeIssueIds = new Set(issues.map((row) => row.id));
      const activeCoverIds = new Set(covers.map((row) => row.id));
      const activeStoryIds = new Set(stories.map((row) => row.id));
      const activeIndividualIds = new Set(individuals.map((row) => row.id));
      const activeAppearanceIds = new Set(appearances.map((row) => row.id));
      const activeArcIds = new Set(arcs.map((row) => row.id));

      const stages: CleanupStageResult[] = [];
      const addStage = (stage: CleanupStageResult) => stages.push(stage);

      const stepMinus1StoryIds = stories
        .filter((story) => activeStoryIds.has(story.id))
        .filter((story) => toInt(story.fkIssue) == null)
        .map((story) => story.id);
      addStage(
        toStageResult("-1) Stories without issue (direct orphan)", stepMinus1StoryIds, (id) => {
          const story = storyById.get(id);
          return `Story#${id} number=${story?.number ?? "?"} fk_issue=${story?.fkIssue ?? "null"}`;
        })
      );
      await deleteByIds(
        (ids) => tx.story.deleteMany({ where: { id: { in: ids } } }),
        stepMinus1StoryIds,
        dryRun
      );
      markDeleted(stepMinus1StoryIds, activeStoryIds);

      const step0IssueIds = findUSIssueIdsWithoutDEReference({
        publishers,
        series,
        issues,
        stories,
      }).ids;
      addStage(
        toStageResult("0) US issues without any DE reference chain", step0IssueIds, (id) => {
          const issue = issueById.get(id);
          const seriesItem = issue && issue.fkSeries != null ? seriesById.get(issue.fkSeries) : null;
          const publisher =
            seriesItem && seriesItem.fkPublisher != null
              ? publisherById.get(seriesItem.fkPublisher)
              : null;
          return `Issue#${id} number=${issue?.number || "?"} variant=${issue?.variant || ""} series="${seriesItem?.title || "?"}" publisher="${publisher?.name || "?"}"`;
        })
      );
      await deleteByIds(
        (ids) => tx.issue.deleteMany({ where: { id: { in: ids } } }),
        step0IssueIds,
        dryRun
      );
      markDeleted(step0IssueIds, activeIssueIds);

      const step1PublisherIds = publishers
        .filter((publisher) => activePublisherIds.has(publisher.id))
        .filter(
          (publisher) =>
            !series.some(
              (seriesItem) =>
                activeSeriesIds.has(seriesItem.id) && toInt(seriesItem.fkPublisher) === publisher.id
            )
        )
        .map((publisher) => publisher.id);
      addStage(
        toStageResult("1) Publisher without series", step1PublisherIds, (id) => {
          const publisher = publisherById.get(id);
          return `Publisher#${id} "${publisher?.name || "?"}"`;
        })
      );
      await deleteByIds(
        (ids) => tx.publisher.deleteMany({ where: { id: { in: ids } } }),
        step1PublisherIds,
        dryRun
      );
      markDeleted(step1PublisherIds, activePublisherIds);

      const step2SeriesIds = series
        .filter((seriesItem) => activeSeriesIds.has(seriesItem.id))
        .filter(
          (seriesItem) =>
            !issues.some(
              (issue) => activeIssueIds.has(issue.id) && toInt(issue.fkSeries) === seriesItem.id
            )
        )
        .map((seriesItem) => seriesItem.id);
      addStage(
        toStageResult("2) Series without issues", step2SeriesIds, (id) => {
          const seriesItem = seriesById.get(id);
          return `Series#${id} "${seriesItem?.title || "?"}" volume=${seriesItem?.volume ?? "?"}`;
        })
      );
      await deleteByIds(
        (ids) => tx.series.deleteMany({ where: { id: { in: ids } } }),
        step2SeriesIds,
        dryRun
      );
      markDeleted(step2SeriesIds, activeSeriesIds);

      const step3SeriesIds = series
        .filter((seriesItem) => activeSeriesIds.has(seriesItem.id))
        .filter((seriesItem) => {
          const publisherId = toInt(seriesItem.fkPublisher);
          return publisherId == null || !activePublisherIds.has(publisherId);
        })
        .map((seriesItem) => seriesItem.id);
      addStage(
        toStageResult("3) Series without publisher", step3SeriesIds, (id) => {
          const seriesItem = seriesById.get(id);
          return `Series#${id} "${seriesItem?.title || "?"}" volume=${seriesItem?.volume ?? "?"}`;
        })
      );
      await deleteByIds(
        (ids) => tx.series.deleteMany({ where: { id: { in: ids } } }),
        step3SeriesIds,
        dryRun
      );
      markDeleted(step3SeriesIds, activeSeriesIds);

      const step4IssueIds = issues
        .filter((issue) => activeIssueIds.has(issue.id))
        .filter((issue) => {
          const seriesId = toInt(issue.fkSeries);
          return seriesId == null || !activeSeriesIds.has(seriesId);
        })
        .map((issue) => issue.id);
      addStage(
        toStageResult("4) Issues without series", step4IssueIds, (id) => {
          const issue = issueById.get(id);
          return `Issue#${id} number=${issue?.number || "?"} variant=${issue?.variant || ""}`;
        })
      );
      await deleteByIds(
        (ids) => tx.issue.deleteMany({ where: { id: { in: ids } } }),
        step4IssueIds,
        dryRun
      );
      markDeleted(step4IssueIds, activeIssueIds);

      const step5CoverIds = covers
        .filter((cover) => activeCoverIds.has(cover.id))
        .filter((cover) => {
          const issueId = toInt(cover.fkIssue);
          return issueId == null || !activeIssueIds.has(issueId);
        })
        .map((cover) => cover.id);
      addStage(
        toStageResult("5) Covers without issue", step5CoverIds, (id) => {
          const cover = coverById.get(id);
          return `Cover#${id} fk_issue=${cover?.fkIssue ?? "null"}`;
        })
      );
      await deleteByIds(
        (ids) => tx.cover.deleteMany({ where: { id: { in: ids } } }),
        step5CoverIds,
        dryRun
      );
      markDeleted(step5CoverIds, activeCoverIds);

      const step6StoryIds = stories
        .filter((story) => activeStoryIds.has(story.id))
        .filter((story) => {
          const issueId = toInt(story.fkIssue);
          return issueId == null || !activeIssueIds.has(issueId);
        })
        .map((story) => story.id);
      addStage(
        toStageResult("6) Stories without issue (after issue cleanup)", step6StoryIds, (id) => {
          const story = storyById.get(id);
          return `Story#${id} number=${story?.number ?? "?"} fk_issue=${story?.fkIssue ?? "null"}`;
        })
      );
      await deleteByIds(
        (ids) => tx.story.deleteMany({ where: { id: { in: ids } } }),
        step6StoryIds,
        dryRun
      );
      markDeleted(step6StoryIds, activeStoryIds);

      const issueLinkedIndividualIds = await readLinkedIndividualIdsForIssues(tx, activeIssueIds);
      const storyLinkedIndividualIds = await readLinkedIndividualIdsForStories(tx, activeStoryIds);
      const coverLinkedIndividualIds = await readLinkedIndividualIdsForCovers(tx, activeCoverIds);

      const step7IndividualIds = individuals
        .filter((individual) => activeIndividualIds.has(individual.id))
        .filter(
          (individual) =>
            !issueLinkedIndividualIds.has(individual.id) &&
            !storyLinkedIndividualIds.has(individual.id) &&
            !coverLinkedIndividualIds.has(individual.id)
        )
        .map((individual) => individual.id);
      addStage(
        toStageResult("7) Individuals without story, cover or issue", step7IndividualIds, (id) => {
          const individual = individualById.get(id);
          return `Individual#${id} "${individual?.name || "?"}"`;
        })
      );
      await deleteByIds(
        (ids) => tx.individual.deleteMany({ where: { id: { in: ids } } }),
        step7IndividualIds,
        dryRun
      );
      markDeleted(step7IndividualIds, activeIndividualIds);

      const storyLinkedAppearanceIds = await readLinkedAppearanceIdsForStories(tx, activeStoryIds);
      const step8AppearanceIds = appearances
        .filter((appearance) => activeAppearanceIds.has(appearance.id))
        .filter((appearance) => !storyLinkedAppearanceIds.has(appearance.id))
        .map((appearance) => appearance.id);
      addStage(
        toStageResult("8) Appearances without story", step8AppearanceIds, (id) => {
          const appearance = appearanceById.get(id);
          return `Appearance#${id} "${appearance?.name || "?"}" type=${appearance?.type || "?"}`;
        })
      );
      await deleteByIds(
        (ids) => tx.appearance.deleteMany({ where: { id: { in: ids } } }),
        step8AppearanceIds,
        dryRun
      );
      markDeleted(step8AppearanceIds, activeAppearanceIds);

      const issueLinkedArcIds = await readLinkedArcIdsForIssues(tx, activeIssueIds);
      const step9ArcIds = arcs
        .filter((arc) => activeArcIds.has(arc.id))
        .filter((arc) => !issueLinkedArcIds.has(arc.id))
        .map((arc) => arc.id);
      addStage(
        toStageResult("9) Arcs without issue", step9ArcIds, (id) => {
          const arc = arcById.get(id);
          return `Arc#${id} "${arc?.title || "?"}" type=${arc?.type || "?"}`;
        })
      );
      await deleteByIds(
        (ids) => tx.arc.deleteMany({ where: { id: { in: ids } } }),
        step9ArcIds,
        dryRun
      );
      markDeleted(step9ArcIds, activeArcIds);

      const report: CleanupDryRunReport = {
        dryRun,
        startedAt,
        finishedAt: new Date().toISOString(),
        totalAffected: stages.reduce((sum, stage) => sum + stage.count, 0),
        stages,
      };

      if (dryRun) {
        throw Object.assign(new Error("__CLEANUP_DRY_RUN_ROLLBACK__"), { report });
      }

      return report;
    }).catch((error: unknown) => {
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        (error as { message?: string }).message === "__CLEANUP_DRY_RUN_ROLLBACK__" &&
        "report" in error
      ) {
        return (error as { report: CleanupDryRunReport }).report;
      }
      throw error;
    });
  } catch {
    return null;
  }
}

export async function triggerManualCleanupDryRun(): Promise<CleanupDryRunReport | null> {
  return runCleanup({ dryRun: true });
}
