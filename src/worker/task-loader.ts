import type { TaskList } from "graphile-worker";
import cleanupTask from "./tasks/cleanup";
import rebuildSearchIndexTask from "./tasks/rebuild-search-index";
import updateDeSeriesGenresTask from "./tasks/update-de-series-genres";
import updateStoryBadgesTask from "./tasks/update-story-filters-all";

export function loadTaskList(): TaskList {
  return {
    "cleanup-db": cleanupTask,
    "update-story-badges": updateStoryBadgesTask,
    "rebuild-search-index": rebuildSearchIndexTask,
    "update-de-series-genres": updateDeSeriesGenresTask,
  };
}
