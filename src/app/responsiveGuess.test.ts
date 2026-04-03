import { getInitialResponsiveGuess } from "./responsiveGuess";

describe("getInitialResponsiveGuess", () => {
  it("should_treat_sec_ch_ua_mobile_hint_as_phone", () => {
    expect(
      getInitialResponsiveGuess({
        userAgent: "Mozilla/5.0",
        secChUaMobile: "?1",
      })
    ).toEqual({
      isPhone: true,
      isDesktop: false,
      isLandscape: false,
    });
  });

  it("should_keep_ipad_as_tablet_without_mobile_hint", () => {
    expect(
      getInitialResponsiveGuess({
        userAgent:
          "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        secChUaMobile: "?0",
      })
    ).toEqual({
      isPhone: false,
      isDesktop: false,
      isLandscape: true,
    });
  });

  it("should_detect_iphone_from_user_agent", () => {
    expect(
      getInitialResponsiveGuess(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      )
    ).toEqual({
      isPhone: true,
      isDesktop: false,
      isLandscape: false,
    });
  });
});
