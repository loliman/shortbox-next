import type { PreviewImportDraft } from "../types/preview-import";

export type MarvelScopeCategory =
  | "marvel"
  | "star_wars"
  | "alien_predator"
  | "crossover"
  | "marvel_manga"
  | "other";

export interface MarvelClassificationResult {
  inScope: boolean;
  category: MarvelScopeCategory;
  reason: string;
}

const STAR_WARS_KEYWORDS = [
  "star wars",
  "darth vader",
  "boba fett",
  "mandalorian",
  "jedi",
  "high republic",
  "ahsoka",
  "skywalker",
  "yoda",
  "clone wars",
];

const ALIEN_PREDATOR_KEYWORDS = [
  "alien",
  "aliens",
  "predator",
  "planet der affen",
  "planet of the apes",
];

const CROSSOVER_KEYWORDS = [
  "jla/avengers",
  "marvel/dc",
  "dc/marvel",
  "godzilla zerstört das marvel",
  "godzilla destroys the marvel",
];

const MARVEL_MANGA_KEYWORDS = [
  "octo-girl",
  "red ronin",
  "deadpool: samurai",
  "spider-man: fake red",
];

const MARVEL_KEYWORDS = [
  "spider-man",
  "spiderman",
  "miles morales",
  "spider-gwen",
  "ghost-spider",
  "venom",
  "carnage",
  "symbiont",
  "avengers",
  "captain america",
  "iron man",
  "thor",
  "hulk",
  "she-hulk",
  "daredevil",
  "punisher",
  "deadpool",
  "wolverine",
  "x-men",
  "cyclops",
  "mutant",
  "fantastic four",
  "silver surfer",
  "doctor strange",
  "black panther",
  "moon knight",
  "blade",
  "thanos",
  "knull",
  "secret wars",
  "civil war",
  "infinity",
  "doctor doom",
  "black cat",
  "marvel",
  "marvel-origins",
  "marvel origins",
];

const DC_SPECIFIC_KEYWORDS = [
  "batman",
  "superman",
  "wonder woman",
  "the flash",
  "justice league",
  "nightwing",
  "harley quinn",
  "green lantern",
  "supergirl",
  "robin",
  "absolute batman",
  "absolute superman",
  "absolute wonder woman",
  "absolute flash",
  "absolute martian",
  "absolute green lantern",
  "dc k.o.",
  "heroes in crisis",
  "crisis on infinite",
  "lobo",
  "sandman",
  "hellblazer",
  "preacher",
  "fables",
  "detective comics",
  "action comics",
];

export function classifyDraftForMarvelScope(
  draft: Pick<PreviewImportDraft, "sourceTitle" | "issueCode" | "values">
): MarvelClassificationResult {
  const code = (draft.issueCode ?? "").toUpperCase();
  const title = (draft.values?.title || "").toLowerCase();
  const seriesTitle = (draft.values?.series?.title || "").toLowerCase();
  const sourceTitle = (draft.sourceTitle || "").toLowerCase();
  const storiesText = (draft.values?.stories || [])
    .map((s) => {
      const parentSeries = (s as { parent?: { issue?: { series?: { title?: string } } } })?.parent
        ?.issue?.series?.title;
      return parentSeries || "";
    })
    .join(" ")
    .toLowerCase();

  const combined = `${sourceTitle} ${seriesTitle} ${title} ${storiesText}`.trim();

  // 1. Crossover check first
  if (CROSSOVER_KEYWORDS.some((kw) => combined.includes(kw) || code.includes("DDCXMA") || code.includes("DMGODZ"))) {
    return {
      inScope: true,
      category: "crossover",
      reason: "Marvel Crossover oder Event (z. B. JLA/Avengers, Godzilla)",
    };
  }

  // 2. Star Wars check
  if (
    STAR_WARS_KEYWORDS.some((kw) => combined.includes(kw)) ||
    code.startsWith("YDSTW") ||
    code.startsWith("YDSWD") ||
    code.startsWith("YDSW") ||
    code.startsWith("DSW")
  ) {
    return {
      inScope: true,
      category: "star_wars",
      reason: "Star Wars Comicreihe",
    };
  }

  // 3. Alien & Predator check
  if (ALIEN_PREDATOR_KEYWORDS.some((kw) => combined.includes(kw))) {
    return {
      inScope: true,
      category: "alien_predator",
      reason: "Alien / Predator (20th Century / Marvel Lizenz)",
    };
  }

  // 4. Marvel Manga check
  if (MARVEL_MANGA_KEYWORDS.some((kw) => combined.includes(kw)) || code.startsWith("DOCTOM") || code.startsWith("DAVENM")) {
    return {
      inScope: true,
      category: "marvel_manga",
      reason: "Marvel Manga Adaption (z. B. Spider-Man Octo-Girl)",
    };
  }

  // 5. Exclude DC pure titles
  const isExplicitDc = DC_SPECIFIC_KEYWORDS.some((kw) => combined.includes(kw));
  if (isExplicitDc) {
    return {
      inScope: false,
      category: "other",
      reason: "DC Comics",
    };
  }

  // 6. Regular Marvel check
  if (
    MARVEL_KEYWORDS.some((kw) => combined.includes(kw)) ||
    code.startsWith("DMA") ||
    code.startsWith("DAMSM") ||
    code.startsWith("DNAVE") ||
    code.startsWith("DWWDP") ||
    code.startsWith("DNDEAD") ||
    code.startsWith("D25XM") ||
    code.startsWith("D25WOL") ||
    code.startsWith("D25UXM") ||
    code.startsWith("D26PUN") ||
    code.startsWith("DDDPR") ||
    code.startsWith("DFFPR") ||
    code.startsWith("DIMPR") ||
    code.startsWith("DCAPR") ||
    code.startsWith("DTHPR") ||
    code.startsWith("DXMOS") ||
    code.startsWith("DXMUNI") ||
    code.startsWith("DUNHU") ||
    code.startsWith("DMSMK") ||
    code.startsWith("DMILES") ||
    code.startsWith("DBLACA") ||
    code.startsWith("DSGGS") ||
    code.startsWith("KHMAOR")
  ) {
    return {
      inScope: true,
      category: "marvel",
      reason: "Marvel Comicreihe",
    };
  }

  return {
    inScope: false,
    category: "other",
    reason: "Nicht im Marvel-Kosmos (z. B. non-Marvel Manga, Roman)",
  };
}

export function isMarvelScopeDraft(
  draft: Pick<PreviewImportDraft, "sourceTitle" | "issueCode" | "values">
): boolean {
  return classifyDraftForMarvelScope(draft).inScope;
}
