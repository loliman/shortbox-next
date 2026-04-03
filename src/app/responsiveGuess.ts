export type InitialResponsiveGuess = {
  isPhone: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
};

export const RESPONSIVE_GUESS_COOKIE_NAME = "shortbox_viewport";

type ResponsiveGuessHeaders = {
  userAgent?: string | null;
  secChUaMobile?: string | null;
  storedGuess?: string | null;
};

const TABLET_USER_AGENT_RE =
  /ipad|tablet|playbook|silk|(android(?!.*mobile))|kindle|kfapwi|sm-t|lenovo tab/i;
const PHONE_USER_AGENT_RE =
  /iphone|ipod|android.*mobile|windows phone|blackberry|bb10|mobile/i;

function normalizeResponsiveGuessHeaders(
  input: string | ResponsiveGuessHeaders | null | undefined
): ResponsiveGuessHeaders {
  if (typeof input === "string") {
    return { userAgent: input };
  }
  return input ?? {};
}

function prefersMobileExperience(secChUaMobile?: string | null): boolean {
  return typeof secChUaMobile === "string" && secChUaMobile.includes("?1");
}

function parseStoredResponsiveGuess(storedGuess?: string | null): InitialResponsiveGuess | null {
  switch (storedGuess) {
    case "phone-portrait":
      return { isPhone: true, isDesktop: false, isLandscape: false };
    case "phone-landscape":
      return { isPhone: true, isDesktop: false, isLandscape: true };
    case "tablet-portrait":
      return { isPhone: false, isDesktop: false, isLandscape: false };
    case "tablet-landscape":
      return { isPhone: false, isDesktop: false, isLandscape: true };
    case "desktop":
      return { isPhone: false, isDesktop: true, isLandscape: true };
    default:
      return null;
  }
}

export function serializeResponsiveGuess(guess: InitialResponsiveGuess): string {
  if (guess.isPhone) {
    return guess.isLandscape ? "phone-landscape" : "phone-portrait";
  }
  if (guess.isDesktop) {
    return "desktop";
  }
  return guess.isLandscape ? "tablet-landscape" : "tablet-portrait";
}

export function getInitialResponsiveGuess(
  input?: string | ResponsiveGuessHeaders | null
): InitialResponsiveGuess {
  const headers = normalizeResponsiveGuessHeaders(input);
  const storedGuess = parseStoredResponsiveGuess(headers.storedGuess);
  if (storedGuess) return storedGuess;
  const userAgent = headers.userAgent ?? "";
  const mobileHint = prefersMobileExperience(headers.secChUaMobile);
  const isTablet = !mobileHint && TABLET_USER_AGENT_RE.test(userAgent);
  const isPhone = mobileHint || (!isTablet && PHONE_USER_AGENT_RE.test(userAgent));
  const isDesktop = !isPhone && !isTablet;

  return {
    isPhone,
    isDesktop,
    // Without viewport dimensions on the server, landscape is the least disruptive default for non-phones.
    isLandscape: !isPhone,
  };
}
