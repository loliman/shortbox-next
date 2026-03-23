import "server-only";

import { revalidateTag } from "next/cache";
import { CHANGE_REQUESTS_CACHE_TAG, NAVIGATION_CACHE_TAG } from "../cache-tags";

export function invalidateNavigationCache() {
  revalidateTag(NAVIGATION_CACHE_TAG, "max");
}

export function invalidateChangeRequestsCache() {
  revalidateTag(CHANGE_REQUESTS_CACHE_TAG, "max");
}
