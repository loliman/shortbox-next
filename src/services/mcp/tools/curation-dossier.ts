import { mcpGetIssueCurationData } from "../../../lib/read/mcp-read";
import {
  findGcdIssueLocally,
  findUhbmccIssueLocally,
  sanitizeComparisonTitle,
  normalizeCurationString,
  type NormalizedCurationStory,
  type CurationDossierResult,
} from "../../../lib/read/mcp-curation-sources-read";

export async function getCurationDossier(params: {
  issue_id?: number;
  series_title?: string;
  issue_number?: string;
}): Promise<CurationDossierResult | { message: string }> {
  const sbIssue = await mcpGetIssueCurationData(params);
  if (!sbIssue) {
    return {
      message: `Kein Heft gefunden für ${JSON.stringify(params)}.`,
    };
  }

  // 1. GCD Lookup
  const preferredGcdId = sbIssue.variants.find((v) => v.gcdId != null)?.gcdId ?? null;
  const gcdMatch = findGcdIssueLocally({
    gcdId: preferredGcdId,
    publisherName: sbIssue.publisher,
    seriesTitle: sbIssue.series,
    issueNumber: sbIssue.number,
  });

  // 2. UHBMCC Lookup
  const uhbmccMatch = findUhbmccIssueLocally({
    publisherName: sbIssue.publisher,
    seriesTitle: sbIssue.series,
    issueNumber: sbIssue.number,
  });

  // 3. Story-by-story reconciliation
  const maxStories = Math.max(
    sbIssue.stories.length,
    gcdMatch?.issue.stories.filter((s) => s.typeId === 19 || !s.typeId).length ?? 0,
    uhbmccMatch?.stories.length ?? 0
  );

  const storiesComparison: NormalizedCurationStory[] = [];
  const recommendedActions: string[] = [];

  const gcdStories = (gcdMatch?.issue.stories ?? []).filter(
    (s) => s.typeId === 19 || s.typeId === undefined
  );
  const uhbmccStories = uhbmccMatch?.stories ?? [];

  for (let idx = 0; idx < maxStories; idx++) {
    const sbStory = sbIssue.stories[idx];
    const gcdStory = gcdStories[idx];
    const uhbmccStory = uhbmccStories[idx];

    const notes: string[] = [];

    // Title reconciliation
    const normSbTitle = sanitizeComparisonTitle(sbStory?.title);
    const normGcdTitle = sanitizeComparisonTitle(gcdStory?.title);
    const normUhbmccTitle = sanitizeComparisonTitle(uhbmccStory?.title);

    let titleStatus: NormalizedCurationStory["titleStatus"] = "SHORTBOX_ONLY";

    if (normSbTitle && normGcdTitle && normUhbmccTitle) {
      if (normSbTitle === normGcdTitle && normSbTitle === normUhbmccTitle) {
        titleStatus = "CONSENSUS";
      } else {
        titleStatus = "CONFLICT";
        notes.push(
          `Titel-Abweichung: Shortbox="${sbStory?.title}" vs GCD="${gcdStory?.title}" vs UHBMCC="${uhbmccStory?.title}"`
        );
      }
    } else if (normSbTitle && (normGcdTitle || normUhbmccTitle)) {
      const extNorm = normGcdTitle || normUhbmccTitle;
      if (normSbTitle === extNorm) {
        titleStatus = "CONSENSUS";
      } else {
        titleStatus = "CONFLICT";
        notes.push(
          `Titel-Abweichung: Shortbox="${sbStory?.title}" vs Extern="${gcdStory?.title || uhbmccStory?.title}"`
        );
      }
    } else if (!normSbTitle && (normGcdTitle || normUhbmccTitle)) {
      titleStatus = "EXTERNAL_ONLY";
      notes.push(`Fehlt in Shortbox: Externe Quellen kennen Titel "${gcdStory?.title || uhbmccStory?.title}"`);
    }

    // Translator reconciliation
    const sbTranslators = sbStory?.translators ?? [];
    const uhbmccTranslators = uhbmccStory?.translators ?? [];
    let translatorStatus: NormalizedCurationStory["translatorStatus"] = "NOT_APPLICABLE";

    if (sbIssue.isUs) {
      translatorStatus = "NOT_APPLICABLE";
    } else if (sbTranslators.length > 0 && uhbmccTranslators.length > 0) {
      const normSbT = sbTranslators.map(normalizeCurationString).sort().join(", ");
      const normUhT = uhbmccTranslators.map(normalizeCurationString).sort().join(", ");
      if (normSbT === normUhT) {
        translatorStatus = "CONSENSUS";
      } else {
        translatorStatus = "CONFLICT";
        notes.push(`Übersetzer-Konflikt: Shortbox=[${sbTranslators.join(", ")}] vs UHBMCC=[${uhbmccTranslators.join(", ")}]`);
      }
    } else if (sbTranslators.length === 0 && uhbmccTranslators.length > 0) {
      translatorStatus = "MISSING_IN_SHORTBOX";
      notes.push(`Fehlt in Shortbox: UHBMCC nennt Übersetzer [${uhbmccTranslators.join(", ")}]`);
    } else if (sbTranslators.length > 0) {
      translatorStatus = "CONSENSUS";
    }

    storiesComparison.push({
      sequenceNumber: idx + 1,
      shortboxStoryId: sbStory?.id,
      shortboxTitle: sbStory?.title,
      shortboxTranslator: sbTranslators.join(", ") || undefined,
      shortboxParentUs: sbStory?.parentUs || undefined,
      gcdTitle: gcdStory?.title,
      gcdScript: gcdStory?.script,
      gcdPencils: gcdStory?.pencils,
      gcdInks: gcdStory?.inks,
      gcdFeature: gcdStory?.feature,
      uhbmccTitle: uhbmccStory?.title,
      uhbmccTranslators: uhbmccTranslators.length > 0 ? uhbmccTranslators : undefined,
      uhbmccOriginalIssue: uhbmccStory?.originalIssue,
      titleStatus,
      translatorStatus,
      notes,
    });
  }

  // Summary recommendations & Decision Classification
  const autonomousDecisions: AutonomousDecision[] = [];
  const nonDecisions: NonDecision[] = [];

  for (const st of storiesComparison) {
    if (st.titleStatus === "CONFLICT") {
      nonDecisions.push({
        field: "story_title",
        storyNumber: st.sequenceNumber,
        reason: "Inhaltliche Titel-Divergenz zwischen Primärquellen",
        sourceValues: {
          ...(st.shortboxTitle ? { shortbox: st.shortboxTitle } : {}),
          ...(st.gcdTitle ? { gcd: st.gcdTitle } : {}),
          ...(st.uhbmccTitle ? { uhbmcc: st.uhbmccTitle } : {}),
        },
        promptForUser: `Für Story #${st.sequenceNumber} liegt ein Titel-Konflikt vor: Shortbox="${st.shortboxTitle ?? ""}", GCD="${st.gcdTitle ?? ""}", UHBMCC="${st.uhbmccTitle ?? ""}". Bitte entscheiden, welcher Titel gilt.`,
      });
    } else if (st.titleStatus === "CONSENSUS" && st.shortboxTitle) {
      autonomousDecisions.push({
        field: "story_title",
        storyNumber: st.sequenceNumber,
        action: "CONFIRM_TITLE",
        appliedValue: st.shortboxTitle,
        rule: "NORMALIZED_CONSENSUS",
        sources: [
          ...(st.shortboxTitle ? ["Shortbox"] : []),
          ...(st.gcdTitle ? ["GCD"] : []),
          ...(st.uhbmccTitle ? ["UHBMCC"] : []),
        ],
      });
    } else if (st.titleStatus === "EXTERNAL_ONLY" && (st.uhbmccTitle || st.gcdTitle)) {
      const bestExtTitle = st.uhbmccTitle || st.gcdTitle || "";
      autonomousDecisions.push({
        field: "story_title",
        storyNumber: st.sequenceNumber,
        action: "IMPORT_TITLE_FROM_PRIMARY_SOURCE",
        appliedValue: bestExtTitle,
        rule: "SOURCE_PRIORITY_IMPORT",
        sources: [st.uhbmccTitle ? "UHBMCC" : "GCD"],
      });
    }

    if (st.translatorStatus === "CONFLICT") {
      nonDecisions.push({
        field: "story_translator",
        storyNumber: st.sequenceNumber,
        reason: "Widersprüchliche Übersetzerangaben zwischen Quellen",
        sourceValues: {
          ...(st.shortboxTranslator ? { shortbox: st.shortboxTranslator } : {}),
          ...(st.uhbmccTranslators ? { uhbmcc: st.uhbmccTranslators.join(", ") } : {}),
        },
        promptForUser: `Für Story #${st.sequenceNumber} widersprechen sich die Übersetzer: Shortbox=[${st.shortboxTranslator ?? ""}] vs UHBMCC=[${(st.uhbmccTranslators ?? []).join(", ")}]. Bitte entscheiden.`,
      });
    } else if (st.translatorStatus === "MISSING_IN_SHORTBOX" && st.uhbmccTranslators && st.uhbmccTranslators.length > 0) {
      autonomousDecisions.push({
        field: "story_translator",
        storyNumber: st.sequenceNumber,
        action: "IMPORT_TRANSLATOR",
        appliedValue: st.uhbmccTranslators.join(", "),
        rule: "SOURCE_PRIORITY_TRANSLATOR",
        sources: ["UHBMCC"],
      });
    }
  }

  if (!preferredGcdId && gcdMatch) {
    autonomousDecisions.push({
      field: "variant_gcd_id",
      action: "LINK_GCD_ID",
      appliedValue: String(gcdMatch.issue.id),
      rule: "GCD_LINKING",
      sources: ["GCD"],
    });
    recommendedActions.push(
      `💡 GCD-Issue #${gcdMatch.issue.id} gefunden: Empfehlung, gcdId=${gcdMatch.issue.id} auf der Variante nachzutragen.`
    );
  }

  const verdict = nonDecisions.length > 0 ? "NON_DECISION" : "AUTONOMOUS";
  const nextStep =
    verdict === "AUTONOMOUS"
      ? "Heft ist autonom entscheidbar. Autonome Entscheidungen dokumentieren/anwenden und mit dem nächsten Heft fortfahren."
      : `🛑 Es liegen ${nonDecisions.length} Nicht-Entscheidung(en) vor. Im Konflikt-Protokoll dokumentieren und dem Nutzer zur Entscheidung vorlegen. Danach mit dem nächsten Heft fortfahren.`;

  if (nonDecisions.length > 0) {
    recommendedActions.push(
      `⚠️ Es existieren ${nonDecisions.length} inhaltliche Konflikte zwischen Quellen. Manuelle Nutzerfreigabe erforderlich!`
    );
  }
  if (autonomousDecisions.length > 0) {
    recommendedActions.push(
      `✅ ${autonomousDecisions.length} Feld(er) können autonom entschieden werden.`
    );
  }

  return {
    issue: {
      id: sbIssue.id,
      series: sbIssue.series,
      number: sbIssue.number,
      publisher: sbIssue.publisher,
      isUs: sbIssue.isUs,
      variants: sbIssue.variants,
    },
    sourcesFound: {
      shortbox: true,
      gcd: Boolean(gcdMatch),
      uhbmcc: Boolean(uhbmccMatch),
    },
    gcdSourceInfo: gcdMatch
      ? {
          gcdIssueId: gcdMatch.issue.id,
          seriesName: gcdMatch.seriesName,
          issueNumber: gcdMatch.issue.number,
          storiesCount: gcdStories.length,
        }
      : undefined,
    uhbmccSourceInfo: uhbmccMatch
      ? {
          file: uhbmccMatch.file,
          seriesTitle: uhbmccMatch.seriesTitle,
          issueNumber: uhbmccMatch.issueNumber,
          storiesCount: uhbmccMatch.stories.length,
        }
      : undefined,
    verdict,
    autonomousDecisions,
    nonDecisions,
    nextStep,
    storiesComparison,
    recommendedActions,
  };
}
