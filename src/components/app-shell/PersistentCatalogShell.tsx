import { cookies, headers } from "next/headers";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import type { CSSProperties } from "react";
import FooterLinks from "../footer/FooterLinks";
import PersistentCatalogChromeClient from "./PersistentCatalogChromeClient";
import { COMPACT_BOTTOM_BAR_CLEARANCE, getNavDrawerWidth } from "../layoutMetrics";
import { getInitialResponsiveGuess, RESPONSIVE_GUESS_COOKIE_NAME } from "../../app/responsiveGuess";
import type { SessionData } from "../../types/session";

type PersistentCatalogShellProps = {
  children: React.ReactNode;
  us: boolean;
  session?: SessionData | null;
  changeRequestsCount?: number;
  previewImportActive?: boolean;
};

export default async function PersistentCatalogShell(
  props: Readonly<PersistentCatalogShellProps>
) {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const initialResponsiveGuess = getInitialResponsiveGuess({
    userAgent: headerStore.get("user-agent"),
    secChUaMobile: headerStore.get("sec-ch-ua-mobile"),
    storedGuess: cookieStore.get(RESPONSIVE_GUESS_COOKIE_NAME)?.value,
  });
  const initialTablet = !initialResponsiveGuess.isPhone && !initialResponsiveGuess.isDesktop;
  const initialNavWide =
    initialResponsiveGuess.isDesktop || (initialTablet && initialResponsiveGuess.isLandscape);
  const initialNavOffset = initialNavWide ? `${getNavDrawerWidth(false)}px` : "0px";
  const initialNavGutter = initialResponsiveGuess.isDesktop ? `${getNavDrawerWidth(false)}px` : "0px";

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--shortbox-body-bg)",
        position: "relative",
        isolation: "isolate",
      }}
    >
      <PersistentCatalogChromeClient
        us={props.us}
        session={props.session}
        changeRequestsCount={props.changeRequestsCount}
        previewImportActive={props.previewImportActive}
      />

      <Box
        component="main"
        sx={{
          display: "flex",
          flexGrow: 1,
          minHeight: 0,
          backgroundColor: "transparent",
        }}
      >
        <Box
          data-shortbox-shell-rail
          style={
            {
              "--shortbox-shell-initial-nav-offset": initialNavOffset,
              "--shortbox-shell-initial-nav-gutter": initialNavGutter,
              "--shortbox-shell-compact-bottom-clearance": COMPACT_BOTTOM_BAR_CLEARANCE,
            } as CSSProperties
          }
          sx={{
            display: "flex",
            flexGrow: 1,
            minWidth: 0,
            minHeight: 0,
            backgroundColor: "transparent",
          }}
        >
          <Card
            className="shortbox-layout-card"
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              minWidth: 0,
              backgroundColor: "var(--shortbox-glass-bg) !important",
              backdropFilter: "var(--shortbox-glass-blur)",
              backgroundImage: "none",
              border: "none",
              overflow: "hidden",
            }}
          >
            <Box
              data-shortbox-shell-content-frame
              sx={{
                flexGrow: 1,
                p: { xs: 2, sm: 3 },
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                className="main-content"
                sx={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {props.children}
              </Box>

              <Box
                data-shortbox-watermark
                sx={{
                  position: "absolute",
                  right: "0px",
                  bottom: "0px",
                  width: 220,
                  height: 220,
                  backgroundImage: 'url("/background.png")',
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right bottom",
                  backgroundSize: "contain",
                  opacity: 0.12,
                  zIndex: 10,
                  pointerEvents: "none",
                  '[data-theme="dark"] &': {
                    filter: "invert(1)",
                    opacity: 0.12,
                  },
                }}
              />
            </Box>

            <Box
              sx={{
                mt: "auto",
                px: { xs: 0, sm: 2 },
                pt: 1.25,
                pb: { xs: 0, sm: 1.25 },
                borderTop: 1,
                borderColor: "divider",
                backgroundColor: "transparent",
                display: "flex",
                justifyContent: { xs: "center", sm: "flex-end" },
              }}
            >
              <FooterLinks />
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
