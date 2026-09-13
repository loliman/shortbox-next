/**
 * Stdio MCP entry point for Claude Desktop.
 * Uses --conditions=react-server so that "server-only" imports are no-ops.
 * Reuses createMcpServer() from src/services/mcp/server.ts — no code duplication.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "../src/services/mcp/server";

async function main() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Shortbox MCP error:", err);
  process.exit(1);
});
