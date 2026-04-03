export type InitialResponsiveGuess = {
  isPhone: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
};

type ResponsiveGuessHeaders = {
  userAgent?: string | null;
  secChUaMobile?: string | null;
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

export function getInitialResponsiveGuess(
  input?: string | ResponsiveGuessHeaders | null
): InitialResponsiveGuess {
  const headers = normalizeResponsiveGuessHeaders(input);
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
