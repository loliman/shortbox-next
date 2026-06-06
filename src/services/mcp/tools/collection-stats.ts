import { mcpGetCollectionStats } from "../../../lib/read/mcp-read";

export async function getCollectionStats() {
  return mcpGetCollectionStats();
}
