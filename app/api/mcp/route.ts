import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/src/services/mcp/server";

/**
 * Thin Next.js route handler for the Shortbox MCP server.
 * All business logic lives in src/services/mcp/.
 * All DB access lives in src/lib/read/mcp-read.ts.
 */
async function handleRequest(req: Request): Promise<Response> {
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — each request is independent
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export { handleRequest as GET, handleRequest as POST, handleRequest as DELETE };
