import { mcpAuditPublicationHealth } from "../../../lib/read/mcp-read";

export async function auditPublicationHealth(params: {
  issue_id?: number;
  series_id?: number;
  publisher_pattern?: string;
  limit?: number;
}) {
  const result = await mcpAuditPublicationHealth(params);

  return {
    summary: {
      totalAudited: result.summary.totalAudited,
      cleanIssues: result.summary.cleanIssues,
      issuesWithErrors: result.summary.issuesWithErrors,
      issuesWithWarnings: result.summary.issuesWithWarnings,
      averageHealthScore: `${result.summary.averageHealthScore}%`,
    },
    issues: result.issues.map((i) => ({
      issueId: i.issueId,
      series: i.series,
      number: i.number,
      title: i.title,
      publisher: i.publisher,
      isUsEdition: i.isUs,
      healthScore: `${i.healthScore}%`,
      storiesCount: i.storiesCount,
      variantsCount: i.variantsCount,
      findingsCount: i.findings.length,
      findings: i.findings,
    })),
  };
}
