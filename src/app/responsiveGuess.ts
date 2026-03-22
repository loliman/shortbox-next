export type InitialResponsiveGuess = {
  isPhone: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
};

const TABLET_USER_AGENT_RE =
  /ipad|tablet|playbook|silk|(android(?!.*mobile))|kindle|kfapwi|sm-t|lenovo tab/i;
const PHONE_USER_AGENT_RE =
  /iphone|ipod|android.*mobile|windows phone|blackberry|bb10|mobile/i;

export function getInitialResponsiveGuess(userAgent: string | null | undefined): InitialResponsiveGuess {
  const normalizedUserAgent = userAgent ?? "";
  const isTablet = TABLET_USER_AGENT_RE.test(normalizedUserAgent);
  const isPhone = !isTablet && PHONE_USER_AGENT_RE.test(normalizedUserAgent);
  const isDesktop = !isPhone && !isTablet;

  return {
    isPhone,
    isDesktop,
    // Without viewport dimensions on the server, landscape is the least disruptive default for non-phones.
    isLandscape: !isPhone,
  };
}
