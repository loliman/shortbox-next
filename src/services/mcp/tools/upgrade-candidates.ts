import { mcpFindUpgradeCandidates } from "../../../lib/read/mcp-read";

export async function findUpgradeCandidates(params: {
  publisher_pattern?: string;
  limit?: number;
}) {
  const candidates = await mcpFindUpgradeCandidates(params);

  if (candidates.length === 0) {
    return {
      message: "Keine Upgrade-Kandidaten gefunden (keine gesammelten Softcover/Hefte mit ungesammeltem Hardcover).",
      total: 0,
      candidates: [],
    };
  }

  return {
    total: candidates.length,
    candidates: candidates.map((c) => ({
      issueId: c.issueId,
      series: c.series,
      number: c.number,
      publisher: c.publisher,
      owned: {
        format: c.ownedVariant.format,
        variantLabel: c.ownedVariant.variantLabel,
        price: c.ownedVariant.price,
      },
      upgradeOpportunity: {
        format: c.upgradeVariant.format,
        variantLabel: c.upgradeVariant.variantLabel,
        price: c.upgradeVariant.price,
        limitation: c.upgradeVariant.limitation ? `Limitiert auf ${c.upgradeVariant.limitation} Ex.` : null,
        isbn: c.upgradeVariant.isbn,
      },
    })),
  };
}
