import { mcpFindSellableReprints } from "../../../lib/read/mcp-read";

interface FindSellableReprintsParams {
  publisher_pattern?: string;
  exclude_formats?: string[];
  exclude_complete_series?: boolean;
  limit?: number;
}

export async function findSellableReprints(params: FindSellableReprintsParams) {
  return mcpFindSellableReprints(params);
}
