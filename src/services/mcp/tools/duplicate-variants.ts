import { mcpFindDuplicateVariants } from "../../../lib/read/mcp-read";

interface FindDuplicateVariantsParams {
  publisher_pattern?: string;
}

export async function findDuplicateVariants(params: FindDuplicateVariantsParams) {
  return mcpFindDuplicateVariants(params);
}
